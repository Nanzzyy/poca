from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: UUID
    email: str
    username: str
    avatar_url: Optional[str] = None
    preferences: Optional[dict[str, Any]] = None
    level: int = 1
    xp_total: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class PublicProfileResponse(BaseModel):
    id: UUID
    username: str
    avatar_url: Optional[str] = None
    level: int = 1
    xp_total: int = 0
    created_at: datetime
    followers_count: int = 0
    following_count: int = 0
    posts_count: int = 0
    trips_count: int = 0
    reviews_count: int = 0
    is_following: bool = False
    is_self: bool = False


class UserPreferencesUpdate(BaseModel):
    preferences: dict[str, Any]


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenRefresh(BaseModel):
    refresh_token: str
