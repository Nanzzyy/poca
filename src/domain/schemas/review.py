from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel


class ReviewCreate(BaseModel):
    rating: int
    title: Optional[str] = None
    content: Optional[str] = None
    photos: list[str] = []
    visit_date: Optional[datetime] = None
    actual_spending: Optional[dict[str, Any]] = None
    travel_tips: Optional[str] = None


class ReviewUpdate(BaseModel):
    rating: Optional[int] = None
    title: Optional[str] = None
    content: Optional[str] = None
    photos: Optional[list[str]] = None
    travel_tips: Optional[str] = None


class ReviewResponse(BaseModel):
    id: UUID
    user_id: UUID
    destination_id: UUID
    rating: int
    title: Optional[str] = None
    content: Optional[str] = None
    photos: list[str] = []
    visit_date: Optional[datetime] = None
    is_verified: bool = False
    moderation_status: str = "pending"
    helpful_count: int = 0
    travel_tips: Optional[str] = None
    created_at: datetime
    username: Optional[str] = None
    avatar_url: Optional[str] = None

    model_config = {"from_attributes": True}


class ReviewSummaryResponse(BaseModel):
    destination_id: UUID
    summary_text: Optional[str] = None
    positive_topics: list[str] = []
    negative_topics: list[str] = []
    sentiment_score: Optional[float] = None
    generated_at: Optional[datetime] = None
    review_count: int = 0
    avg_rating: float = 0.0

    model_config = {"from_attributes": True}
