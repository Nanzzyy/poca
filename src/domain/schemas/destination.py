from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel


class CategoryResponse(BaseModel):
    id: int
    name: str
    icon: Optional[str] = None
    slug: str
    parent_id: Optional[int] = None

    model_config = {"from_attributes": True}


class DestinationList(BaseModel):
    id: UUID
    name: str
    slug: str
    category: Optional[CategoryResponse] = None
    latitude: float
    longitude: float
    country: str
    city: Optional[str] = None
    images: list[str] = []
    tags: list[str] = []
    price_level: str = "mid"
    rating_avg: float = 0.0
    review_count: int = 0

    model_config = {"from_attributes": True}


class DestinationDetail(DestinationList):
    description: Optional[str] = None
    address: Optional[str] = None
    opening_hours: Optional[dict[str, Any]] = None
    best_visiting_hours: Optional[dict[str, Any]] = None
    local_tips: Optional[dict[str, Any]] = None
    seasonal_info: Optional[dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime


class LocalGuideResponse(BaseModel):
    food: list[dict[str, Any]] = []
    customs: list[dict[str, Any]] = []
    hidden_gems: list[dict[str, Any]] = []
    seasonal: Optional[dict[str, Any]] = None


class GeoJSONFeature(BaseModel):
    type: str = "Feature"
    geometry: dict[str, Any]
    properties: dict[str, Any]


class GeoJSONCollection(BaseModel):
    type: str = "FeatureCollection"
    features: list[GeoJSONFeature]


class PaginatedResponse(BaseModel):
    items: list[Any]
    total: int
    page: int
    size: int
    pages: int
