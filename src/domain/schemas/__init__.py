from typing import Any, Optional

from pydantic import BaseModel


class BudgetEstimate(BaseModel):
    accommodation: Optional[float] = None
    food: Optional[float] = None
    transportation: Optional[float] = None
    tickets: Optional[float] = None
    parking: Optional[float] = None
    emergency_reserve: Optional[float] = None
    total: float = 0.0
    currency: str = "IDR"
    breakdown: dict[str, Any] = {}


class RecommendationRequest(BaseModel):
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    categories: list[str] = []
    travel_style: Optional[str] = None  # budget, comfort, luxury
    duration_days: Optional[int] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    radius_km: Optional[float] = None
    preferences: Optional[dict[str, Any]] = None


class AIResponse(BaseModel):
    message: str
    context_updated: bool = False
    recommendations: list[dict[str, Any]] = []
