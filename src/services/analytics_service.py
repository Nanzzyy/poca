import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from src.repositories.analytics_repo import AnalyticsRepository


class AnalyticsService:
    def __init__(self, db: AsyncSession):
        self.repo = AnalyticsRepository(db)

    async def dashboard(self) -> dict:
        now = datetime.now(timezone.utc)
        week_ago = now - timedelta(days=7)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        total_users = await self.repo.count_active_users()
        total_dests = await self.repo.count_active_destinations()
        total_posts = await self.repo.count_posts()
        total_views_today = await self.repo.count_pageviews_since(today_start)
        weekly_views = await self.repo.weekly_pageviews(week_ago)
        new_users = await self.repo.count_new_users_since(week_ago)
        top_pages = await self.repo.top_pages_since(week_ago, limit=5)

        return {
            "total_users": total_users,
            "total_destinations": total_dests,
            "total_posts": total_posts,
            "total_views_today": total_views_today,
            "weekly_views": [{"date": str(d), "count": c} for d, c in weekly_views],
            "new_users_week": new_users,
            "top_pages": [{"path": p, "count": c} for p, c in top_pages],
        }

    async def traffic(self, page: int, size: int) -> dict:
        rows, total = await self.repo.search_pageviews(page, size)
        return {
            "items": [
                {
                    "id": str(r.id), "path": r.path, "user_id": str(r.user_id) if r.user_id else None,
                    "ip": r.ip, "created_at": r.created_at.isoformat(),
                }
                for r in rows
            ],
            "total": total, "page": page, "size": size,
        }

    async def audit_logs(
        self, *, page: int, size: int, action: str, actor_id: str, date_from: str, date_to: str,
    ) -> dict:
        parsed_actor_id = None
        if actor_id:
            try:
                parsed_actor_id = uuid.UUID(actor_id)
            except ValueError:
                raise ValueError("Invalid actor_id")

        parsed_date_from = None
        if date_from:
            try:
                parsed_date_from = datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc)
            except ValueError:
                raise ValueError("Invalid date_from (expected ISO 8601)")

        parsed_date_to = None
        if date_to:
            try:
                parsed_date_to = datetime.fromisoformat(date_to).replace(tzinfo=timezone.utc)
            except ValueError:
                raise ValueError("Invalid date_to (expected ISO 8601)")

        rows, total = await self.repo.search_audit_logs(
            action=action or None, actor_id=parsed_actor_id,
            date_from=parsed_date_from, date_to=parsed_date_to, page=page, size=size,
        )
        return {
            "items": [
                {
                    "id": str(r.id),
                    "actor_id": str(r.actor_id) if r.actor_id else None,
                    "action": r.action,
                    "target_type": r.target_type,
                    "target_id": r.target_id,
                    "ip_address": r.ip_address,
                    "user_agent": r.user_agent,
                    "meta": r.meta or {},
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                }
                for r in rows
            ],
            "total": total, "page": page, "size": size,
        }
