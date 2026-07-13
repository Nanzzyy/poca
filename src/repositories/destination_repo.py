from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from math import radians, sin, cos, acos
from src.domain.models.destination import Destination, Category

class DestinationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, dest_id: str) -> Destination | None:
        stmt = select(Destination).where(Destination.id == dest_id).options(selectinload(Destination.category))
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_slug(self, slug: str) -> Destination | None:
        stmt = select(Destination).where(Destination.slug == slug).options(selectinload(Destination.category))
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def search(self, q: str = "", category_id: int | None = None, price_level: str | None = None,
                     rating_min: float | None = None, tags: list[str] | None = None,
                     lat: float | None = None, lng: float | None = None, radius_km: float | None = None,
                     page: int = 1, size: int = 20) -> tuple[list[Destination], int]:
        query = select(Destination).where(Destination.is_active == True)

        if q:
            query = query.where(
                or_(
                    Destination.name.ilike(f"%{q}%"),
                    Destination.description.ilike(f"%{q}%"),
                    Destination.city.ilike(f"%{q}%"),
                    Destination.country.ilike(f"%{q}%"),
                )
            )
        if category_id:
            query = query.where(Destination.category_id == category_id)
        if price_level:
            query = query.where(Destination.price_level == price_level)
        if rating_min:
            query = query.where(Destination.rating_avg >= rating_min)
        if tags:
            query = query.where(Destination.tags.has_any(tags))
        if lat is not None and lng is not None and radius_km is not None:
            # Approximate bounding box for efficiency before haversine
            lat_deg = radius_km / 111.0
            lng_deg = radius_km / (111.0 * cos(radians(lat)))
            query = query.where(
                Destination.latitude.between(lat - lat_deg, lat + lat_deg),
                Destination.longitude.between(lng - lng_deg, lng + lng_deg),
            )

        # Count
        count_query = select(func.count()).select_from(query.subquery())
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        # Paginate
        query = query.order_by(Destination.rating_avg.desc()).offset((page - 1) * size).limit(size)
        query = query.options(selectinload(Destination.category))
        result = await self.db.execute(query)
        items = list(result.scalars().all())

        return items, total

    async def get_nearby(self, dest_id: str, radius_km: float = 10) -> list[Destination]:
        # Get the source destination's coords first
        source = await self.get_by_id(dest_id)
        if not source:
            return []
        lat, lng = source.latitude, source.longitude
        lat_deg = radius_km / 111.0
        lng_deg = radius_km / (111.0 * cos(radians(lat)))
        stmt = (
            select(Destination)
            .where(
                Destination.id != dest_id,
                Destination.is_active == True,
                Destination.latitude.between(lat - lat_deg, lat + lat_deg),
                Destination.longitude.between(lng - lng_deg, lng + lng_deg),
            )
            .options(selectinload(Destination.category))
            .order_by(Destination.rating_avg.desc())
            .limit(20)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_markers_in_bounds(self, sw_lat: float, sw_lng: float, ne_lat: float, ne_lng: float,
                                     categories: list[int] | None = None) -> list[Destination]:
        stmt = (
            select(Destination)
            .where(
                Destination.is_active == True,
                Destination.latitude.between(sw_lat, ne_lat),
                Destination.longitude.between(sw_lng, ne_lng),
            )
            .options(selectinload(Destination.category))
        )
        if categories:
            stmt = stmt.where(Destination.category_id.in_(categories))
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_categories(self) -> list[Category]:
        stmt = select(Category)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
