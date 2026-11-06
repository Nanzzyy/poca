"""Regression tests for the extracted UserService.admin_update — in
particular the self-lockout guard (an admin can't demote/deactivate their
own account) that used to live inline in admin.py."""
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from src.services.user_service import UserService


class _FakeDB:
    def __init__(self):
        self.flush_calls = 0

    async def flush(self):
        self.flush_calls += 1


class _FakeUserRepo:
    def __init__(self, user):
        self.db = _FakeDB()
        self._user = user

    async def get_by_id(self, user_id):
        return self._user if self._user and str(self._user.id) == user_id else None


def _service_for(user):
    service = UserService.__new__(UserService)
    service.repo = _FakeUserRepo(user)
    return service


@pytest.mark.asyncio
async def test_admin_cannot_remove_own_admin_role():
    admin_user = SimpleNamespace(id="admin-1", role="admin", is_active=True, is_verified=True)
    service = _service_for(admin_user)

    with patch("src.services.user_service.log_audit", new=AsyncMock()):
        with pytest.raises(PermissionError):
            await service.admin_update(
                "admin-1", actor=admin_user, role="user", is_active=None, is_verified=None,
                ip_address=None, user_agent="",
            )


@pytest.mark.asyncio
async def test_admin_cannot_deactivate_own_account():
    admin_user = SimpleNamespace(id="admin-1", role="admin", is_active=True, is_verified=True)
    service = _service_for(admin_user)

    with patch("src.services.user_service.log_audit", new=AsyncMock()):
        with pytest.raises(PermissionError):
            await service.admin_update(
                "admin-1", actor=admin_user, role=None, is_active=False, is_verified=None,
                ip_address=None, user_agent="",
            )


@pytest.mark.asyncio
async def test_admin_can_update_another_user_and_audit_log_is_written():
    admin_user = SimpleNamespace(id="admin-1", role="admin", is_active=True, is_verified=True)
    target = SimpleNamespace(id="user-2", role="user", is_active=True, is_verified=False)
    service = _service_for(target)

    with patch("src.services.user_service.log_audit", new=AsyncMock()) as mock_log:
        await service.admin_update(
            "user-2", actor=admin_user, role="admin", is_active=None, is_verified=None,
            ip_address="1.2.3.4", user_agent="pytest",
        )

    assert target.role == "admin"
    mock_log.assert_awaited_once()
    assert mock_log.call_args.kwargs["action"] == "role_change"


@pytest.mark.asyncio
async def test_missing_user_raises_value_error():
    service = _service_for(None)

    with pytest.raises(ValueError, match="User not found"):
        await service.admin_update(
            "nope", actor=SimpleNamespace(id="admin-1"), role="admin",
            is_active=None, is_verified=None, ip_address=None, user_agent="",
        )
