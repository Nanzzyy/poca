from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.domain.models.gamification import Achievement, UserAchievement


class GamificationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self) -> list[Achievement]:
        stmt = select(Achievement)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_user_achievements(self, user_id: str) -> list[UserAchievement]:
        stmt = (
            select(UserAchievement)
            .where(UserAchievement.user_id == user_id)
            .options(selectinload(UserAchievement.achievement))
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
