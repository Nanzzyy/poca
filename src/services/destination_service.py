from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.domain.models.destination import Destination, Category
from src.repositories.destination_repo import DestinationRepository


class DestinationService:
    def __init__(self, db: AsyncSession):
        self.repo = DestinationRepository(db)

    async def get_local_guide(self, destination_id: str) -> dict:
        dest = await self.repo.get_by_id(destination_id)
        if not dest:
            raise ValueError("Destination not found")
        local_tips = dest.local_tips or {}
        return {
            "food": local_tips.get("food", []),
            "customs": local_tips.get("customs", []),
            "hidden_gems": local_tips.get("hidden_gems", []),
            "seasonal": dest.seasonal_info or {},
        }

    async def get_geo_json_markers(
        self,
        sw_lat: float, sw_lng: float,
        ne_lat: float, ne_lng: float,
        categories: list[int] | None = None,
    ) -> dict:
        dests = await self.repo.get_markers_in_bounds(sw_lat, sw_lng, ne_lat, ne_lng, categories)

        features = []
        for d in dests:
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [d.longitude, d.latitude],
                },
                "properties": {
                    "id": str(d.id),
                    "name": d.name,
                    "category": d.category.name if d.category else None,
                    "price_level": d.price_level,
                    "rating_avg": d.rating_avg,
                    "images": d.images[:1] if d.images else [],
                    "country": d.country,
                    "city": d.city,
                    "slug": d.slug,
                    "marker_type": self._get_marker_type(d),
                },
            })

        return {"type": "FeatureCollection", "features": features}

    def _get_marker_type(self, dest: Destination) -> str:
        if dest.rating_avg >= 4.5 and dest.review_count > 50:
            return "recommended"
        elif dest.rating_avg >= 4.0 and dest.review_count > 20:
            return "trending"
        elif dest.review_count < 5 and dest.rating_avg > 0:
            return "hidden_gem"
        elif dest.rating_avg >= 4.0 and dest.review_count > 100:
            return "community_favorite"
        elif dest.review_count > 200:
            return "crowded"
        return "default"
