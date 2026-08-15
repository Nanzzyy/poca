"""Google Places API integration endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_db, require_admin
from src.domain.models.user import User
from src.middleware.rate_limit import rate_limit
from src.services.google_places_service import GooglePlacesService

router = APIRouter(prefix="/places", tags=["places"])


@router.post("/enrich/{dest_id}", dependencies=[Depends(rate_limit(limit=10, period=3600, scope="user"))])
async def enrich_destination(
    dest_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
) -> dict:
    """Enrich a destination with Google Places data."""
    svc = GooglePlacesService(db)
    try:
        result = await svc.enrich_destination(dest_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/enrich-all", dependencies=[Depends(rate_limit(limit=2, period=3600, scope="user"))])
async def enrich_all(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
) -> list[dict]:
    """Enrich all destinations with Google Places data."""
    svc = GooglePlacesService(db)
    return await svc.enrich_all(batch_size=5)


@router.get("/search")
async def search_places(
    q: str,
    lat: float | None = None,
    lng: float | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Search Google Places for real POI data."""
    svc = GooglePlacesService(db)
    return await svc.search_places(q, lat, lng)
