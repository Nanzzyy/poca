from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AchievementResponse(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    xp_reward: int = 0

    model_config = {"from_attributes": True}


class UserAchievementResponse(BaseModel):
    achievement: AchievementResponse
    unlocked_at: datetime

    model_config = {"from_attributes": True}


class UserStatsResponse(BaseModel):
    level: int = 1
    xp_total: int = 0
    achievements_count: int = 0
    reviews_count: int = 0
    trips_count: int = 0


class LeaderboardEntry(BaseModel):
    username: str
    avatar_url: Optional[str] = None
    level: int
    xp_total: int
    achievements_count: int
