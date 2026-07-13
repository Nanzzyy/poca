from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_db, get_current_user, require_user
from src.domain.models.user import User
from src.domain.schemas.destination import DestinationList, PaginatedResponse
from src.domain.schemas import RecommendationRequest
from src.services.recommendation_service import RecommendationService

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.post("")
async def get_recommendations(
    body: RecommendationRequest,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user),  # optional auth
) -> PaginatedResponse:
    # Merge user preferences if available and no explicit body prefs
    preferences = body.preferences or {}
    if not body.preferences and user and user.preferences:
        preferences = user.preferences

    service = RecommendationService(db)
    items, total = await service.recommend(
        budget_min=body.budget_min,
        budget_max=body.budget_max,
        categories=body.categories,
        travel_style=body.travel_style,
        location_lat=body.location_lat,
        location_lng=body.location_lng,
        radius_km=body.radius_km,
        preferences=preferences,
        page=page,
        size=size,
    )
    return PaginatedResponse(
        items=[DestinationList.model_validate(d) for d in items],
        total=total, page=page, size=size,
        pages=(total + size - 1) // size,
    )


@router.get("/quick")
async def quick_recommendations(
    category: str | None = None,
    price_level: str | None = None,
    rating_min: float | None = None,
    lat: float | None = None,
    lng: float | None = None,
    radius: float | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse:
    service = RecommendationService(db)
    items, total = await service.recommend(
        travel_style=price_level,
        location_lat=lat,
        location_lng=lng,
        radius_km=radius,
        categories=[category] if category else None,
        page=page,
        size=size,
    )
    return PaginatedResponse(
        items=[DestinationList.model_validate(d) for d in items],
        total=total, page=page, size=size,
        pages=(total + size - 1) // size,
    )
