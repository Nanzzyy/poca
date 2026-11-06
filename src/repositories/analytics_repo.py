import uuid
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models.audit_log import AuditLog
from src.domain.models.destination import Destination
from src.domain.models.page_view import PageView
from src.domain.models.post import Post
from src.domain.models.user import User


class AnalyticsRepository:
    """Read-only aggregation queries backing the admin dashboard, traffic
    log, and audit log. Audit log *writes* go through
    src/services/audit_service.py — this is the read side."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _count(self, table, *where) -> int:
        q = select(func.count()).select_from(table)
        for w in where:
            q = q.where(w)
        return (await self.db.execute(q)).scalar() or 0

    async def count_active_users(self) -> int:
        return await self._count(User, User.is_active == True)

    async def count_active_destinations(self) -> int:
        return await self._count(Destination, Destination.is_active == True)

    async def count_posts(self) -> int:
        return await self._count(Post)

    async def count_pageviews_since(self, since: datetime) -> int:
        return await self._count(PageView, PageView.created_at >= since)

    async def count_new_users_since(self, since: datetime) -> int:
        return await self._count(User, User.created_at >= since)

    async def weekly_pageviews(self, since: datetime) -> list[tuple]:
        stmt = (
            select(func.date(PageView.created_at), func.count())
            .where(PageView.created_at >= since)
            .group_by(func.date(PageView.created_at))
            .order_by(func.date(PageView.created_at))
        )
        return (await self.db.execute(stmt)).all()

    async def top_pages_since(self, since: datetime, limit: int = 5) -> list[tuple]:
        stmt = (
            select(PageView.path, func.count().label("c"))
            .where(PageView.created_at >= since)
            .group_by(PageView.path)
            .order_by(func.count().desc())
            .limit(limit)
        )
        return (await self.db.execute(stmt)).all()

    async def search_pageviews(self, page: int, size: int) -> tuple[list[PageView], int]:
        stmt = select(PageView).order_by(PageView.created_at.desc())
        total = (await self.db.execute(select(func.count()).select_from(stmt.subquery()))).scalar() or 0
        rows = (await self.db.execute(stmt.offset((page - 1) * size).limit(size))).scalars().all()
        return list(rows), total

    async def search_audit_logs(
        self, *, action: str | None, actor_id: uuid.UUID | None,
        date_from: datetime | None, date_to: datetime | None, page: int, size: int,
    ) -> tuple[list[AuditLog], int]:
        stmt = select(AuditLog)
        if action:
            stmt = stmt.where(AuditLog.action == action)
        if actor_id:
            stmt = stmt.where(AuditLog.actor_id == actor_id)
        if date_from:
            stmt = stmt.where(AuditLog.created_at >= date_from)
        if date_to:
            stmt = stmt.where(AuditLog.created_at <= date_to)

        total = (await self.db.execute(select(func.count()).select_from(stmt.subquery()))).scalar() or 0
        stmt = stmt.order_by(AuditLog.created_at.desc()).offset((page - 1) * size).limit(size)
        rows = (await self.db.execute(stmt)).scalars().all()
        return list(rows), total
