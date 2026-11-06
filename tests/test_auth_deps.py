"""Deactivated users must lose access immediately, not just on next token
refresh (HIGH-01 — get_current_user never checked User.is_active)."""
import uuid

import pytest
from jose import jwt
from starlette.requests import Request

from src.core.config import settings
from src.core.dependencies import get_current_user
from src.domain.models.user import User
from src.repositories.user_repo import UserRepository


def _request_with_cookie(token: str) -> Request:
    return Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/api/v1/users/me",
            "headers": [(b"cookie", f"poca_access={token}".encode())],
            "client": ("127.0.0.1", 8000),
            "server": ("test", 8000),
            "scheme": "https",
        }
    )


def _token_for(user_id: uuid.UUID) -> str:
    return jwt.encode({"sub": str(user_id)}, settings.jwt_secret, algorithm=settings.jwt_algorithm)


@pytest.mark.asyncio
async def test_deactivated_user_is_rejected(monkeypatch):
    user_id = uuid.uuid4()
    deactivated = User(id=user_id, email="x@x.com", username="x", hashed_password="h", is_active=False)

    async def _fake_get_by_id(self, uid):
        return deactivated

    monkeypatch.setattr(UserRepository, "get_by_id", _fake_get_by_id)

    result = await get_current_user(_request_with_cookie(_token_for(user_id)), credentials=None, db=None)
    assert result is None


@pytest.mark.asyncio
async def test_active_user_is_accepted(monkeypatch):
    user_id = uuid.uuid4()
    active = User(id=user_id, email="x@x.com", username="x", hashed_password="h", is_active=True)

    async def _fake_get_by_id(self, uid):
        return active

    monkeypatch.setattr(UserRepository, "get_by_id", _fake_get_by_id)

    result = await get_current_user(_request_with_cookie(_token_for(user_id)), credentials=None, db=None)
    assert result is active
