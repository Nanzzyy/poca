import math
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models.destination import Destination
from src.repositories.destination_repo import DestinationRepository


class RecommendationService:
    def __init__(self, db: AsyncSession):
        self.repo = DestinationRepository(db)

    async def recommend(
        self,
        budget_min: float | None = None,
        budget_max: float | None = None,
        categories: list[str] | None = None,
        travel_style: str | None = None,
        location_lat: float | None = None,
        location_lng: float | None = None,
        radius_km: float | None = None,
        preferences: dict[str, Any] | None = None,
        page: int = 1,
        size: int = 20,
    ) -> tuple[list[Destination], int]:
        price_level = None
        if travel_style == "budget":
            price_level = "budget"
        elif travel_style == "comfort":
            price_level = "mid"
        elif travel_style == "luxury":
            price_level = "luxury"

        # Map categories list to category_id (by slug)
        category_id = None
        if categories:
            all_cats = await self.repo.get_categories()
            for cat in all_cats:
                if cat.slug in categories:
                    category_id = cat.id
                    break

        return await self.repo.search(
            q=preferences.get("query", "") if preferences else "",
            category_id=category_id,
            price_level=price_level,
            rating_min=preferences.get("min_rating") if preferences else None,
            tags=preferences.get("tags") if preferences else None,
            lat=location_lat,
            lng=location_lng,
            radius_km=radius_km,
            page=page,
            size=size,
        )
