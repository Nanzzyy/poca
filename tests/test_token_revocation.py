"""HIGH-03 — logout only cleared cookies client-side; a stolen refresh token
stayed valid for the full jwt_refresh_expiry_days after "logout". Verifies
the Redis-backed denylist in src/services/token_service.py."""
import time
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from jose import jwt

from src.core.config import settings
from src.services import token_service


class _FakeRedis:
    def __init__(self):
        self.store: dict[str, tuple[str, float | None]] = {}

    async def set(self, key, value, ex=None):
        expires_at = time.time() + ex if ex else None
        self.store[key] = (value, expires_at)

    async def exists(self, key):
        entry = self.store.get(key)
        if not entry:
            return 0
        _, expires_at = entry
        if expires_at is not None and time.time() > expires_at:
            del self.store[key]
            return 0
        return 1


def _refresh_token(jti: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    return jwt.encode(
        {"sub": "user-1", "jti": jti, "exp": expire},
        settings.jwt_refresh_secret,
        algorithm=settings.jwt_algorithm,
    )


@pytest.mark.asyncio
async def test_revoked_token_is_detected(monkeypatch):
    fake = _FakeRedis()
    monkeypatch.setattr(token_service, "get_redis", lambda: fake)

    jti = str(uuid.uuid4())
    token = _refresh_token(jti)

    assert await token_service.is_refresh_token_revoked(jti) is False
    await token_service.revoke_refresh_token(token)
    assert await token_service.is_refresh_token_revoked(jti) is True


@pytest.mark.asyncio
async def test_non_revoked_token_is_not_flagged(monkeypatch):
    fake = _FakeRedis()
    monkeypatch.setattr(token_service, "get_redis", lambda: fake)

    assert await token_service.is_refresh_token_revoked(str(uuid.uuid4())) is False


@pytest.mark.asyncio
async def test_revoke_without_redis_is_a_safe_noop(monkeypatch):
    monkeypatch.setattr(token_service, "get_redis", lambda: None)

    await token_service.revoke_refresh_token("not-even-a-valid-token")
    assert await token_service.is_refresh_token_revoked("some-jti") is False


def test_refresh_token_carries_a_jti():
    from src.api.v1.users import create_refresh_token

    token = create_refresh_token("user-1")
    payload = jwt.decode(token, settings.jwt_refresh_secret, algorithms=[settings.jwt_algorithm])
    assert payload.get("jti")
