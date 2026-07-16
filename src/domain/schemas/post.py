from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class MediaItem(BaseModel):
    type: str = Field(..., description="image | video")
    url: str


class PostCreate(BaseModel):
    content: str
    media: list[MediaItem] = []
    destination_id: Optional[UUID] = None


class CommentCreate(BaseModel):
    content: str


class CommentResponse(BaseModel):
    id: UUID
    post_id: UUID
    user_id: UUID
    content: str
    created_at: datetime
    username: Optional[str] = None
    avatar_url: Optional[str] = None

    model_config = {"from_attributes": True}


class PostResponse(BaseModel):
    id: UUID
    user_id: UUID
    destination_id: Optional[UUID] = None
    content: str
    media: list[dict[str, Any]] = []
    like_count: int = 0
    comment_count: int = 0
    liked_by_me: bool = False
    created_at: datetime
    username: Optional[str] = None
    avatar_url: Optional[str] = None

    model_config = {"from_attributes": True}
