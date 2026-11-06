import re
import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.domain.models.destination import Destination, Category, DestinationSection
from src.domain.section_types import SECTION_TYPES
from src.repositories.destination_repo import DestinationRepository
from src.services.audit_service import log_audit


def _slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


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

    async def bulk_import(self, items: list, template) -> tuple[int, list[dict]]:
        """Create many destinations in one request. Slug-uniqueness is
        checked with a single batched query up front (get_existing_slugs)
        instead of one SELECT per item — also incidentally fixes a latent
        bug where two items with the same name in the same batch could both
        resolve to the same slug (neither saw the other, since nothing was
        flushed until the end)."""
        candidates = []
        for i, item in enumerate(items):
            name = item.name.strip()
            slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
            candidates.append((i, name, slug, item))

        used_slugs = await self.repo.get_existing_slugs({c[2] for c in candidates})

        count = 0
        errors: list[dict] = []
        for i, name, slug, item in candidates:
            try:
                if slug in used_slugs:
                    slug = f"{slug}-{uuid.uuid4().hex[:6]}"
                used_slugs.add(slug)

                dest_id = uuid.uuid4()
                dest = Destination(
                    id=dest_id, name=name, slug=slug,
                    category_id=item.category_id,
                    latitude=item.latitude, longitude=item.longitude,
                    country=item.country, city=item.city,
                    address=item.address, description=item.description,
                    images=item.images, tags=item.tags,
                    price_level=item.price_level, rating_avg=item.rating_avg,
                )
                self.repo.db.add(dest)

                if template:
                    for s in template.sections:
                        self.repo.db.add(DestinationSection(
                            destination_id=dest_id,
                            section_type=s.get("type", ""),
                            title=s.get("title"),
                            order=s.get("order", 0),
                            data=s.get("defaults", {}),
                        ))

                count += 1
            except Exception as e:  # per-item construction error — record, don't abort batch
                errors.append({"index": i, "name": name, "error": str(e)})

        await self.repo.db.flush()
        return count, errors

    async def _unique_slug(self, name: str) -> str:
        slug = _slugify(name)
        taken = await self.repo.get_existing_slugs({slug})
        if slug in taken:
            slug = f"{slug}-{uuid.uuid4().hex[:6]}"
        return slug

    async def admin_create(
        self, body, *, actor_id, ip_address: str | None, user_agent: str,
    ) -> Destination:
        name = body.name.strip()
        slug = await self._unique_slug(name)
        dest = Destination(
            name=name, slug=slug, category_id=body.category_id,
            latitude=body.latitude, longitude=body.longitude,
            country=body.country, city=body.city, address=body.address,
            description=body.description, images=body.images, tags=body.tags,
            price_level=body.price_level, rating_avg=body.rating_avg, is_active=body.is_active,
        )
        self.repo.db.add(dest)
        await self.repo.db.flush()
        await log_audit(
            action="destination_create", actor_id=actor_id, target_type="destination",
            target_id=str(dest.id), ip_address=ip_address, user_agent=user_agent, meta={"name": name},
        )
        return dest

    async def admin_create_with_template(
        self, body, template, *, actor_id, ip_address: str | None, user_agent: str,
    ) -> Destination:
        """Same as admin_create, but applies an already-fetched template's
        sections (router fetches the PageTemplate — this service doesn't own
        that model)."""
        dest = await self.admin_create(body, actor_id=actor_id, ip_address=ip_address, user_agent=user_agent)
        if template:
            for s in template.sections:
                self.repo.db.add(DestinationSection(
                    destination_id=dest.id, section_type=s.get("type", ""),
                    title=s.get("title"), order=s.get("order", 0), data=s.get("defaults", {}),
                ))
            await self.repo.db.flush()
        return dest

    async def create_from_template(self, body, template) -> Destination:
        name = body.name.strip()
        if not name:
            raise ValueError("Name required")
        slug = await self._unique_slug(name)

        dest = Destination(
            name=name, slug=slug, category_id=body.category_id,
            latitude=body.latitude, longitude=body.longitude,
            country=body.country, city=body.city, address=body.address,
            description=body.description, images=body.images, tags=body.tags,
            price_level=body.price_level,
        )
        self.repo.db.add(dest)
        await self.repo.db.flush()

        for idx, s in enumerate(template.sections):
            section_key = s.get("type", "") + f"_{idx}"
            override = body.section_overrides.get(section_key, {})
            self.repo.db.add(DestinationSection(
                destination_id=dest.id, section_type=s.get("type", ""),
                title=s.get("title"), order=s.get("order", idx),
                data={**s.get("defaults", {}), **override},
            ))
        await self.repo.db.flush()
        return dest

    async def create_from_place(self, body) -> Destination:
        name = body.name.strip()
        slug = await self._unique_slug(name)
        images = [body.image_url] if body.image_url else []
        dest = Destination(
            name=name, slug=slug,
            latitude=body.lat, longitude=body.lng,
            country=body.country, city=body.city, address=body.address,
            description=body.description, images=images, tags=body.tags or ["wisata"],
            price_level=body.price_level,
        )
        self.repo.db.add(dest)
        await self.repo.db.flush()
        return dest

    async def admin_update(
        self, dest_id: str, values: dict, *, actor_id, ip_address: str | None, user_agent: str,
    ) -> None:
        dest = await self.repo.get_bare(dest_id)
        if not dest:
            raise ValueError("Destination not found")

        for field in (
            "name", "slug", "category_id", "latitude", "longitude", "country", "city",
            "address", "description", "price_level", "rating_avg", "tags", "is_active",
            "opening_hours", "best_visiting_hours", "local_tips", "seasonal_info",
        ):
            if field in values:
                setattr(dest, field, values[field])
        if "images" in values:
            # Cap at 3 per destination — enforced in app layer (service + admin + FE).
            dest.images = (values["images"] or [])[:3]

        await self.repo.db.flush()
        await log_audit(
            action="destination_update", actor_id=actor_id, target_type="destination",
            target_id=str(dest.id), ip_address=ip_address, user_agent=user_agent,
            meta={"fields": list(values.keys())},
        )

    async def admin_soft_delete(
        self, dest_id: str, *, actor_id, ip_address: str | None, user_agent: str,
    ) -> None:
        dest = await self.repo.get_bare(dest_id)
        if not dest:
            raise ValueError("Destination not found")
        dest.is_active = False
        await self.repo.db.flush()
        await log_audit(
            action="destination_delete", actor_id=actor_id, target_type="destination",
            target_id=str(dest.id), ip_address=ip_address, user_agent=user_agent, meta={"name": dest.name},
        )

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
