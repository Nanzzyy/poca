from fastapi import APIRouter, Depends, HTTPException, Query
from math import radians, cos, sin, asin, sqrt
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_db
from src.domain.schemas.destination import (
    CategoryResponse,
    DestinationDetail,
    DestinationList,
    GeoJSONCollection,
    LocalGuideResponse,
    PaginatedResponse,
)
from src.repositories.destination_repo import DestinationRepository
from src.services.destination_service import DestinationService

router = APIRouter(prefix="/destinations", tags=["destinations"])


@router.get("")
async def list_destinations(
    q: str = "",
    category_id: int | None = None,
    price_level: str | None = None,
    rating_min: float | None = None,
    city: str | None = None,
    sort: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
    radius: float | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse:
    repo = DestinationRepository(db)
    items, total = await repo.search(
        q=q, category_id=category_id, price_level=price_level,
        rating_min=rating_min, city=city, sort=sort,
        lat=lat, lng=lng, radius_km=radius,
        page=page, size=size,
    )
    return PaginatedResponse(
        items=[DestinationList.model_validate(d) for d in items],
        total=total, page=page, size=size,
        pages=(total + size - 1) // size,
    )


@router.get("/categories/all")
async def get_categories(
    db: AsyncSession = Depends(get_db),
) -> list[CategoryResponse]:
    repo = DestinationRepository(db)
    cats = await repo.get_categories()
    return [CategoryResponse.model_validate(c) for c in cats]


@router.get("/{dest_id}")
async def get_destination(
    dest_id: str,
    db: AsyncSession = Depends(get_db),
) -> DestinationDetail:
    repo = DestinationRepository(db)
    dest = await repo.get_by_id(dest_id)
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")
    return DestinationDetail.model_validate(dest)


@router.get("/{dest_id}/nearby")
async def get_nearby(
    dest_id: str,
    radius: float = Query(10, ge=1),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    repo = DestinationRepository(db)
    dests = await repo.get_nearby(dest_id, radius)
    # Get source coordinates for distance calculation
    source = await repo.get_by_id(dest_id)
    src_lat, src_lng = (source.latitude, source.longitude) if source else (0, 0)
    def haversine(lat1, lng1, lat2, lng2):
        R = 6371
        dlat, dlng = radians(lat2-lat1), radians(lng2-lng1)
        a = sin(dlat/2)**2 + cos(radians(lat1))*cos(radians(lat2))*sin(dlng/2)**2
        return round(R * 2 * asin(sqrt(a)), 1)

    result = []
    for d in dests:
        item = DestinationList.model_validate(d).model_dump()
        item["distance"] = f"{haversine(src_lat, src_lng, d.latitude, d.longitude)} km"
        result.append(item)
    return result


@router.get("/{dest_id}/local-guide")
async def get_local_guide(
    dest_id: str,
    db: AsyncSession = Depends(get_db),
) -> LocalGuideResponse:
    service = DestinationService(db)
    try:
        guide = await service.get_local_guide(dest_id)
        return LocalGuideResponse(**guide)
    except ValueError:
        raise HTTPException(status_code=404, detail="Destination not found")
