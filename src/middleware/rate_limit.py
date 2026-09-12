"""Lightweight rate limiting (SEC-04).

Redis-backed (via the existing async client) with an in-memory fallback so the
app still enforces limits when Redis is unavailable. Applied per-endpoint via a
FastAPI dependency.

Keys are scoped by IP for unauthenticated endpoints (login/register/analytics)
and by user id for authenticated endpoints (AI messages, enrich).
"""
from __future__ import annotations

import asyncio
import time
from collections import defaultdict, deque
from ipaddress import ip_address
from typing import Awaitable, Callable

from fastapi import Depends, HTTPException, Request, status

from src.api.deps import get_current_user
from src.core.redis import get_redis
from src.domain.models.user import User

# In-memory fallback: key -> deque of timestamps.
_memory: dict[str, deque[float]] = defaultdict(deque)
_memory_lock = asyncio.Lock()
_REDIS_KEY_PREFIX = "poca:rl:v2"


def _valid_ip(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return str(ip_address(value.strip()))
    except ValueError:
        return None


def _is_private_proxy(value: str | None) -> bool:
    if not value:
        return False
    try:
        address = ip_address(value)
        return address.is_private or address.is_loopback or address.is_link_local
    except ValueError:
        return False


def _client_ip(request: Request) -> str:
    # Cloudflare overwrites CF-Connecting-IP at its edge. Prefer it when
    # present so all users do not share the Next.js proxy/container IP.
    forwarded_ip = _valid_ip(request.headers.get("cf-connecting-ip"))
    if forwarded_ip:
        return forwarded_ip

    client_host = request.client.host if request.client else None
    # Only trust X-Forwarded-For when the immediate peer is an internal
    # reverse proxy. This avoids letting direct clients bypass rate limits by
    # sending arbitrary forwarding headers.
    if _is_private_proxy(client_host):
        forwarded_for = request.headers.get("x-forwarded-for", "")
        forwarded_ip = _valid_ip(forwarded_for.split(",", 1)[0])
        if forwarded_ip:
            return forwarded_ip

    return _valid_ip(client_host) or "unknown"


async def _is_allowed(key: str, limit: int, period: int) -> bool:
    redis = get_redis()
    now = time.time()

    if redis:
        try:
            redis_key = f"{_REDIS_KEY_PREFIX}:{key}"
            count = await redis.incr(redis_key)
            if count == 1:
                await redis.expire(redis_key, period)
            return count <= limit
        except Exception:
            pass  # fall through to in-memory

    async with _memory_lock:
        q = _memory[key]
        while q and now - q[0] >= period:
            q.popleft()
        if len(q) >= limit:
            return False
        q.append(now)
        return True


def _scope_dependency(scope: str):
    """Return a dependency that resolves the rate-limit key for `scope`."""
    async def _key(request: Request, user: User | None = Depends(get_current_user)) -> str:
        if scope == "user":
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required",
                )
            return f"user:{user.id}"
        return f"ip:{_client_ip(request)}"
    return _key


def rate_limit(limit: int, period: int, scope: str = "ip") -> Callable:
    """Build a per-endpoint rate-limit dependency.

    `scope` = "ip" (keyed by client IP) or "user" (keyed by authenticated user).
    """
    key_dep = _scope_dependency(scope)

    async def limiter(key: str = Depends(key_dep)) -> None:
        if not await _is_allowed(key, limit, period):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please try again later.",
            )

    return limiter
