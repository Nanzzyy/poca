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
from typing import Awaitable, Callable

from fastapi import Depends, HTTPException, Request, status

from src.api.deps import get_current_user
from src.core.redis import get_redis
from src.domain.models.user import User

# In-memory fallback: key -> deque of timestamps.
_memory: dict[str, deque[float]] = defaultdict(deque)
_memory_lock = asyncio.Lock()


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


async def _is_allowed(key: str, limit: int, period: int) -> bool:
    redis = get_redis()
    now = time.time()

    if redis:
        try:
            count = await redis.incr(f"poca:rl:{key}")
            if count == 1:
                await redis.expire(f"poca:rl:{key}", period)
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
