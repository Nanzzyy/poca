"""Audit logging helpers (SEC-14)."""
from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import async_session_factory
from src.domain.models.audit_log import AuditLog


async def log_audit(
    action: str,
    *,
    actor_id: uuid.UUID | str | None = None,
    target_type: str | None = None,
    target_id: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    meta: dict[str, Any] | None = None,
) -> None:
    """Append an audit log entry using its own short-lived session.

    Using a dedicated session (instead of the request's) keeps audit entries
    durable even when the surrounding request fails — e.g. `login_failed` is
    logged just before raising 401, which would otherwise roll back with the
    request's `get_db()` session."""
    async with async_session_factory() as db:
        db.add(AuditLog(
            actor_id=uuid.UUID(str(actor_id)) if actor_id else None,
            action=action,
            target_type=target_type,
            target_id=str(target_id) if target_id is not None else None,
            ip_address=ip_address,
            user_agent=(user_agent or "")[:500] or None,
            meta=meta or {},
        ))
        await db.commit()
