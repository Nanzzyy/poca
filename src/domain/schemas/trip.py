from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class TripActivityCreate(BaseModel):
    name: str
    description: Optional[str] = None
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    estimated_cost: Optional[float] = None
    currency: str = "IDR"
    category: Optional[str] = None


class TripActivityResponse(BaseModel):
    id: UUID
    trip_day_id: UUID
    name: str
    description: Optional[str] = None
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    estimated_cost: Optional[float] = None
    currency: str = "IDR"
    category: Optional[str] = None
    order_index: int = 0

    model_config = {"from_attributes": True}


class TripDayCreate(BaseModel):
    day_number: int
    date: Optional[datetime] = None
    notes: Optional[str] = None


class TripDayResponse(BaseModel):
    id: UUID
    trip_id: UUID
    day_number: int
    date: Optional[datetime] = None
    notes: Optional[str] = None
    activities: list[TripActivityResponse] = []

    model_config = {"from_attributes": True}


class TripCreate(BaseModel):
    name: str
    destination_id: Optional[UUID] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    currency: str = "IDR"
    is_public: bool = False


class TripUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[str] = None
    total_budget: Optional[float] = None
    is_public: Optional[bool] = None


class TripResponse(BaseModel):
    id: UUID
    user_id: UUID
    destination_id: Optional[UUID] = None
    name: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: str = "draft"
    total_budget: Optional[float] = None
    currency: str = "IDR"
    is_public: bool = False
    created_at: datetime
    days: list[TripDayResponse] = []

    model_config = {"from_attributes": True}
