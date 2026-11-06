"""Refresh-token revocation (defense-in-depth for logout).

Without this, a stolen refresh token stayed valid for the full
jwt_refresh_expiry_days (default 7) even after the legitimate user "logged
out" — logout only cleared the cookie client-side. This adds a Redis
denylist keyed by the token's `jti`, checked on refresh.

Fails open if Redis is unavailable: this is a defense-in-depth control, not
the primary auth gate (the short-lived access token already bounds exposure
to jwt_access_expiry_minutes), consistent with the rate limiter's existing
availability-first fallback philosophy.
"""
from __future__ import annotations

import time

from jose import JWTError, jwt

from src.core.config import settings
from src.core.redis import get_redis

_REVOKED_PREFIX = "poca:revoked_refresh"


async def revoke_refresh_token(token: str) -> None:
    redis = get_redis()
    if not redis:
        return
    try:
        payload = jwt.decode(
            token,
            settings.jwt_refresh_secret,
            algorithms=[settings.jwt_algorithm],
            options={"verify_exp": False},
        )
    except JWTError:
        return

    jti = payload.get("jti")
    if not jti:
        return

    exp = payload.get("exp")
    ttl = max(int(exp - time.time()), 1) if exp else settings.jwt_refresh_expiry_days * 86400
    try:
        await redis.set(f"{_REVOKED_PREFIX}:{jti}", "1", ex=ttl)
    except Exception:
        pass


async def is_refresh_token_revoked(jti: str | None) -> bool:
    if not jti:
        return False
    redis = get_redis()
    if not redis:
        return False
    try:
        return bool(await redis.exists(f"{_REVOKED_PREFIX}:{jti}"))
    except Exception:
        return False
