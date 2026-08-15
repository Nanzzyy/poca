"""Tests for the audit logging service (SEC-14)."""
import uuid
from unittest.mock import AsyncMock, patch

import pytest

from src.domain.models.audit_log import AuditLog
from src.services.audit_service import log_audit


@pytest.mark.asyncio
async def test_log_audit_writes_entry_and_commits():
    fake_session = AsyncMock()
    with patch("src.services.audit_service.async_session_factory") as factory:
        factory.return_value.__aenter__.return_value = fake_session
        await log_audit(
            action="login_failed",
            target_type="user",
            target_id="x@y.com",
            ip_address="1.2.3.4",
            user_agent="test-agent",
        )

    fake_session.add.assert_called_once()
    entry = fake_session.add.call_args[0][0]
    assert isinstance(entry, AuditLog)
    assert entry.action == "login_failed"
    assert entry.target_id == "x@y.com"
    assert entry.ip_address == "1.2.3.4"
    assert entry.actor_id is None
    fake_session.commit.assert_called_once()


@pytest.mark.asyncio
async def test_log_audit_parses_actor_id():
    fake_session = AsyncMock()
    actor = uuid.uuid4()
    with patch("src.services.audit_service.async_session_factory") as factory:
        factory.return_value.__aenter__.return_value = fake_session
        await log_audit(action="login_success", actor_id=actor)

    entry = fake_session.add.call_args[0][0]
    assert entry.actor_id == actor


@pytest.mark.asyncio
async def test_log_audit_truncates_user_agent():
    fake_session = AsyncMock()
    with patch("src.services.audit_service.async_session_factory") as factory:
        factory.return_value.__aenter__.return_value = fake_session
        await log_audit(action="login", user_agent="a" * 1000)

    entry = fake_session.add.call_args[0][0]
    assert len(entry.user_agent) == 500
