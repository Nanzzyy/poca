from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.domain.models.destination import Destination, Category, DestinationSection
from src.domain.section_types import SECTION_TYPES
from src.repositories.destination_repo import DestinationRepository


class DestinationService:
    def __init__(self, db: AsyncSession):
        self.repo = DestinationRepository(db)

    # ── Sections (admin) ────────────────────────────────────────────────

    async def list_sections(self, dest_id: str) -> list[DestinationSection]:
        if not await self.repo.get_bare(dest_id):
            raise ValueError("Destination not found")
        return await self.repo.get_sections(dest_id)

    async def create_section(
        self, dest_id: str, *, section_type: str, title: str | None,
        order: int, visible: bool, data: dict,
    ) -> DestinationSection:
        if not await self.repo.get_bare(dest_id):
            raise ValueError("Destination not found")
        if section_type not in SECTION_TYPES:
            raise ValueError(f"Unknown section type: {section_type}")
        return await self.repo.create_section(
            dest_id, section_type, title=title, order=order, visible=visible, data=data,
        )

    async def update_section(
        self, dest_id: str, section_id: str, *,
        title: str | None, order: int | None, visible: bool | None, data: dict | None,
    ) -> DestinationSection:
        section = await self.repo.get_section(dest_id, section_id)
        if not section:
            raise ValueError("Section not found")
        if title is not None:
            section.title = title
        if order is not None:
            section.order = order
        if visible is not None:
            section.visible = visible
        if data is not None:
            section.data = data
        await self.repo.db.flush()
        return section

    async def delete_section(self, dest_id: str, section_id: str) -> None:
        section = await self.repo.get_section(dest_id, section_id)
        if not section:
            raise ValueError("Section not found")
        await self.repo.delete_section(section)

    async def reorder_sections(self, dest_id: str, items: list) -> None:
        if not await self.repo.get_bare(dest_id):
            raise ValueError("Destination not found")
        sections = await self.repo.get_sections_by_ids(dest_id, [item.id for item in items])
        sections_by_id = {str(s.id): s for s in sections}
        for item in items:
            section = sections_by_id.get(str(item.id))
            if section:
                section.order = item.order
        await self.repo.db.flush()

    async def apply_template(self, dest_id: str, template) -> int:
        if not await self.repo.get_bare(dest_id):
            raise ValueError("Destination not found")

        existing = await self.repo.get_sections(dest_id)
        existing_by_type = {s.section_type: s for s in existing}

        template_types = {s.get("type") for s in template.sections}
        for s in existing:
            if s.section_type not in template_types:
                await self.repo.delete_section(s)

        for idx, ts in enumerate(template.sections):
            stype = ts.get("type", "")
            if stype in existing_by_type:
                existing_section = existing_by_type[stype]
                existing_section.order = ts.get("order", idx)
                if ts.get("title"):
                    existing_section.title = ts["title"]
            else:
                await self.repo.create_section(
                    dest_id, stype, title=ts.get("title"), order=ts.get("order", idx),
                    data=ts.get("defaults", {}),
                )

        await self.repo.db.flush()
        return len(template.sections)

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
