from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from math import radians, sin, cos, acos
from src.domain.models.destination import Destination, Category, DestinationSection


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in km (spherical law of cosines)."""
    rlat1, rlat2, rdlng = radians(lat1), radians(lat2), radians(lng2 - lng1)
    return 6371.0 * acos(max(-1.0, min(1.0, sin(rlat1) * sin(rlat2) + cos(rlat1) * cos(rlat2) * cos(rdlng))))

class DestinationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, dest_id: str) -> Destination | None:
        stmt = (
            select(Destination)
            .where(Destination.id == dest_id)
            .options(selectinload(Destination.category), selectinload(Destination.sections))
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_ids(self, dest_ids: list[str]) -> list[Destination]:
        stmt = (
            select(Destination)
            .where(Destination.id.in_(dest_ids), Destination.is_active == True)
            .options(selectinload(Destination.category))
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_by_slug(self, slug: str) -> Destination | None:
        stmt = select(Destination).where(Destination.slug == slug).options(selectinload(Destination.category))
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def search(self, q: str = "", category_id: int | None = None, price_level: str | None = None,
                     rating_min: float | None = None, tags: list[str] | None = None,
                     city: str | None = None, cities: list[str] | None = None,
                     exclude_category_ids: list[int] | None = None, sort: str | None = None,
                     lat: float | None = None, lng: float | None = None, radius_km: float | None = None,
                     page: int = 1, size: int = 20,
                     include_inactive: bool = False) -> tuple[list[Destination], int]:
        query = select(Destination)
        if not include_inactive:
            query = query.where(Destination.is_active == True)

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
        if exclude_category_ids:
            query = query.where(Destination.category_id.not_in(exclude_category_ids))
        if price_level:
            query = query.where(Destination.price_level == price_level)
        if rating_min:
            query = query.where(Destination.rating_avg >= rating_min)
        if city:
            query = query.where(Destination.city.ilike(f"%{city}%"))
        if cities:
            # OR across multiple city names — used for region lookups where the
            # user says "bali" but the DB stores Denpasar/Badung/Tabanan/etc.
            query = query.where(or_(*[Destination.city.ilike(f"%{c}%") for c in cities]))
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

        # Paginate + sort
        order = {
            "popular": Destination.review_count.desc(),
            "name": Destination.name.asc(),
        }.get(sort or "", Destination.rating_avg.desc())
        query = query.order_by(order).offset((page - 1) * size).limit(size)
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
        )
        result = await self.db.execute(stmt)
        candidates = list(result.scalars().all())
        # Bounding box is an approximation — filter by true haversine distance and
        # return the genuinely nearest places (not the highest-rated within the box).
        scored = [(d, _haversine_km(lat, lng, d.latitude, d.longitude)) for d in candidates if _haversine_km(lat, lng, d.latitude, d.longitude) <= radius_km]
        scored.sort(key=lambda t: t[1])
        return [d for d, _ in scored[:20]]

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

    async def semantic_search(
        self,
        query_embedding: list[float],
        cities: list[str] | None = None,
        exclude_category_ids: list[int] | None = None,
        category_id: int | None = None,
        limit: int = 5,
    ) -> list[Destination]:
        """Semantic search using cosine similarity on stored embeddings.

        Embeddings are stored as JSON text in the `embedding` column.
        We compute cosine similarity in Python since pgvector isn't used as TEXT.
        For production with pgvector VECTOR type, use:
            ORDER BY embedding <=> query_embedding (cosine distance)
        """
        import json as json_mod

        stmt = (
            select(Destination)
            .where(Destination.is_active == True, Destination.embedding.isnot(None))
            .options(selectinload(Destination.category))
        )
        if cities:
            stmt = stmt.where(or_(*[Destination.city.ilike(f"%{c}%") for c in cities]))
        if category_id:
            stmt = stmt.where(Destination.category_id == category_id)
        if exclude_category_ids:
            stmt = stmt.where(Destination.category_id.not_in(exclude_category_ids))

        result = await self.db.execute(stmt)
        destinations = list(result.scalars().all())

        if not destinations or not query_embedding:
            return []

        # Compute cosine similarity in Python
        def cosine_sim(a: list[float], b: list[float]) -> float:
            dot = sum(x * y for x, y in zip(a, b))
            norm_a = sum(x * x for x in a) ** 0.5
            norm_b = sum(x * x for x in b) ** 0.5
            if norm_a == 0 or norm_b == 0:
                return 0.0
            return dot / (norm_a * norm_b)

        scored = []
        for dest in destinations:
            try:
                emb = json_mod.loads(dest.embedding)
                score = cosine_sim(query_embedding, emb)
                scored.append((score, dest))
            except (json_mod.JSONDecodeError, TypeError):
                continue

        scored.sort(key=lambda x: x[0], reverse=True)
        return [dest for _, dest in scored[:limit]]
