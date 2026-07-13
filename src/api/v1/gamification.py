from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_db, require_user
from src.domain.models.user import User
from src.domain.schemas.gamification import (
    AchievementResponse,
    LeaderboardEntry,
    UserAchievementResponse,
    UserStatsResponse,
)
from src.repositories.gamification_repo import GamificationRepository
from src.services.gamification_service import GamificationService

router = APIRouter(prefix="/gamification", tags=["gamification"])


@router.get("/users/me/achievements")
async def get_my_achievements(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> list[UserAchievementResponse]:
    repo = GamificationRepository(db)
    uas = await repo.get_user_achievements(user.id)
    return [UserAchievementResponse.model_validate(ua) for ua in uas]


@router.get("/users/me/stats")
async def get_my_stats(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> UserStatsResponse:
    svc = GamificationService(db)
    stats = await svc.get_user_stats(user.id)
    return UserStatsResponse(**stats)


@router.get("/achievements")
async def list_achievements(
    db: AsyncSession = Depends(get_db),
) -> list[AchievementResponse]:
    repo = GamificationRepository(db)
    achievements = await repo.get_all()
    return [AchievementResponse.model_validate(a) for a in achievements]


@router.get("/leaderboard")
async def get_leaderboard(
    db: AsyncSession = Depends(get_db),
) -> list[LeaderboardEntry]:
    svc = GamificationService(db)
    return await svc.get_leaderboard()
