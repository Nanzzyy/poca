from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str

    @field_validator("password")
    @classmethod
    def _validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain a lowercase letter")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain an uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain a number")
        return v


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
    role: str = "user"
    is_verified: bool = False
    is_active: bool = True
    created_at: datetime

    model_config = {"from_attributes": True}


class PublicProfileResponse(BaseModel):
    id: UUID
    username: str
    avatar_url: Optional[str] = None
    level: int = 1
    xp_total: int = 0
    is_verified: bool = False
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


class TrackPageviewRequest(BaseModel):
    path: str = ""

    @field_validator("path")
    @classmethod
    def _validate_path(cls, v: str) -> str:
        v = v.strip()[:500]
        if not v:
            raise ValueError("path is required")
        return v


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenRefresh(BaseModel):
    refresh_token: str
