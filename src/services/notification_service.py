"""Create in-app notifications. Used by posts, users (follow), gamification, trips."""
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models.notification import Notification


async def create_notification(
    db: AsyncSession,
    *,
    user_id: str | UUID,
    type: str,
    title: str,
    subtitle: str | None = None,
    actor_id: str | UUID | None = None,
    meta: dict | None = None,
) -> Notification:
    notif = Notification(
        user_id=user_id,
        actor_id=actor_id,
        type=type,
        title=title,
        subtitle=subtitle,
        meta=meta or {},
    )
    db.add(notif)
    await db.flush()
    return notif
