from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from src.domain.models.gamification import Achievement, UserAchievement, Badge, UserBadge
from src.domain.models.review import Review
from src.domain.models.trip import Trip


class GamificationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_stats(self, user_id: str) -> dict:
        # XP and level
        stmt = select(func.coalesce(func.sum(Achievement.xp_reward), 0)).where(
            UserAchievement.user_id == user_id,
            UserAchievement.achievement_id == Achievement.id,
        )
        result = await self.db.execute(stmt)
        xp_from_achievements = result.scalar() or 0

        # Count reviews
        stmt = select(func.count(Review.id)).where(Review.user_id == user_id)
        result = await self.db.execute(stmt)
        reviews_count = result.scalar() or 0

        # Count trips
        stmt = select(func.count(Trip.id)).where(Trip.user_id == user_id)
        result = await self.db.execute(stmt)
        trips_count = result.scalar() or 0

        # Count achievements
        stmt = select(func.count(UserAchievement.achievement_id)).where(UserAchievement.user_id == user_id)
        result = await self.db.execute(stmt)
        achievements_count = result.scalar() or 0

        # Calculate level from XP
        xp_total = xp_from_achievements + (reviews_count * 10) + (trips_count * 25)
        level = max(1, int(xp_total / 100) + 1)

        return {
            "level": level,
            "xp_total": xp_total,
            "achievements_count": achievements_count,
            "reviews_count": reviews_count,
            "trips_count": trips_count,
        }

    async def check_achievements(self, user_id: str) -> list[Achievement]:
        """Check and award any newly unlocked achievements."""
        stmt = select(Achievement)
        result = await self.db.execute(stmt)
        all_achievements = list(result.scalars().all())

        # Get user's current achievements
        stmt = select(UserAchievement.achievement_id).where(UserAchievement.user_id == user_id)
        result = await self.db.execute(stmt)
        earned_ids = {row[0] for row in result}

        stats = await self.get_user_stats(user_id)
        newly_unlocked = []

        for ach in all_achievements:
            if ach.id in earned_ids:
                continue
            criteria = ach.criteria or {}
            unlocked = False

            if ach.code == "first_review" and stats["reviews_count"] >= 1:
                unlocked = True
            elif ach.code == "five_reviews" and stats["reviews_count"] >= 5:
                unlocked = True
            elif ach.code == "first_trip" and stats["trips_count"] >= 1:
                unlocked = True
            elif ach.code == "globetrotter" and stats["trips_count"] >= 5:
                unlocked = True
            elif ach.code == "achievement_hunter" and stats["achievements_count"] >= 3:
                unlocked = True
            elif ach.code == "xp_milestone_500" and stats["xp_total"] >= 500:
                unlocked = True

            if unlocked:
                ua = UserAchievement(user_id=user_id, achievement_id=ach.id)
                self.db.add(ua)
                newly_unlocked.append(ach)

        if newly_unlocked:
            await self.db.flush()

        return newly_unlocked

    async def get_leaderboard(self, limit: int = 20) -> list[dict]:
        from src.domain.models.user import User

        stmt = (
            select(
                User.username,
                User.avatar_url,
                User.level,
                User.xp_total,
            )
            .where(User.is_active == True)
            .order_by(User.xp_total.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        leaderboard = []
        for row in rows:
            leaderboard.append({
                "username": row[0],
                "avatar_url": row[1],
                "level": row[2] or 1,
                "xp_total": row[3] or 0,
                "achievements_count": 0,  # Simplified
            })
        return leaderboard
