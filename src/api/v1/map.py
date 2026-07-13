from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_db
from src.domain.schemas.destination import GeoJSONCollection
from src.services.destination_service import DestinationService

router = APIRouter(prefix="/map", tags=["map"])


@router.get("/markers")
async def get_map_markers(
    sw_lat: float = Query(..., description="South-west latitude"),
    sw_lng: float = Query(..., description="South-west longitude"),
    ne_lat: float = Query(..., description="North-east latitude"),
    ne_lng: float = Query(..., description="North-east longitude"),
    categories: str | None = Query(None, description="Comma-separated category IDs"),
    db: AsyncSession = Depends(get_db),
) -> GeoJSONCollection:
    cat_ids = [int(c) for c in categories.split(",") if c.strip().isdigit()] if categories else None
    service = DestinationService(db)
    result = await service.get_geo_json_markers(sw_lat, sw_lng, ne_lat, ne_lng, cat_ids)
    return GeoJSONCollection(**result)
