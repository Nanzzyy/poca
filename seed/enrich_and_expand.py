"""Enrich existing destinations (replace dead images) + add curated POIs.

Uses FreePlacesService (Wikidata/Wikipedia/Nominatim) — free, no key.
Run: PYTHONPATH=. .venv/bin/python -m seed.enrich_and_expand
"""
from __future__ import annotations

import asyncio
import re
import sys

from sqlalchemy import select
from src.core.database import async_session_factory
from src.domain.models.destination import Category, Destination
from src.services.free_places_service import FreePlacesService

# Curated popular Indonesian POIs across categories.
# (name, category_slug, city, rating, reviews, tags)
CURATED: list[tuple[str, str, str, float, int, list[str]]] = [
    # ── Pantai ──
    ("Nusa Dua", "pantai", "Badung", 4.6, 210, ["beach", "luxury", "snorkeling"]),
    ("Pandawa Beach", "pantai", "Badung", 4.7, 180, ["beach", "cliff", "photo"]),
    ("Padang Padang Beach", "pantai", "Badung", 4.5, 150, ["beach", "surf", "cove"]),
    ("Gili Trawangan", "pantai", "Lombok", 4.6, 320, ["island", "beach", "snorkeling"]),
    ("Pink Beach Komodo", "pantai", "Labuan Bajo", 4.8, 140, ["beach", "pink", "national park"]),
    # ── Candi / Sejarah ──
    ("Goa Gajah", "candi", "Gianyar", 4.4, 190, ["temple", "heritage", "cave"]),
    ("Pura Lempuyang", "candi", "Karangasem", 4.7, 220, ["temple", "view", "gateway"]),
    ("Tirta Empul", "candi", "Gianyar", 4.6, 240, ["temple", "holy spring", "purification"]),
    # ── Alam ──
    ("Sekumpul Waterfall", "alam", "Buleleng", 4.8, 160, ["waterfall", "nature", "trek"]),
    ("Mount Batur", "gunung", "Bangli", 4.7, 280, ["volcano", "sunrise", "hiking"]),
    ("Kawah Ijen", "alam", "Banyuwangi", 4.8, 170, ["volcano", "blue fire", "crater"]),
    ("Taman Nasional Komodo", "alam", "Labuan Bajo", 4.9, 350, ["national park", "komodo", "island"]),
    ("Raja Ampat", "alam", "Raja Ampat", 4.9, 290, ["islands", "diving", "nature"]),
    ("Danau Toba", "alam", "Sumatra Utara", 4.7, 200, ["lake", "island", "nature"]),
    ("Bromo Tengger Semeru", "alam", "Probolinggo", 4.9, 380, ["volcano", "sunrise", "national park"]),
    # ── Budaya ──
    ("Tirta Gangga", "budaya", "Karangasem", 4.6, 170, ["water palace", "garden", "culture"]),
    ("Taman Ayun", "budaya", "Mengwi", 4.5, 140, ["temple", "garden", "heritage"]),
    ("Keraton Yogyakarta", "budaya", "Yogyakarta", 4.7, 260, ["palace", "history", "culture"]),
    # ── Kuliner / Resto ──
    ("Warung Wardani", "kuliner", "Denpasar", 4.5, 120, ["nasi campur", "balinese", "local"]),
    ("Bebek Bengil", "kuliner", "Ubud", 4.4, 230, ["bebek", "fried duck", "restaurant"]),
    # ── Hiburan ──
    ("Waterbom Bali", "hiburan", "Kuta", 4.7, 410, ["waterpark", "family", "fun"]),
    ("Bali Safari Marine Park", "hiburan", "Gianyar", 4.6, 340, ["safari", "family", "zoo"]),
    # ── Penginapan (high-profile resorts) ──
    ("Aman Resort Ubud", "belanja", "Ubud", 4.9, 90, ["resort", "luxury", "ubud"]),
]


def _slug(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s or "place"


def _price_from_rating(rating: float) -> str:
    return "luxury" if rating >= 4.7 else ("mid" if rating >= 4.3 else "budget")


async def main() -> int:
    async with async_session_factory() as db:
        # category lookup
        cat_rows = (await db.execute(select(Category))).scalars().all()
        cat_by_slug = {c.slug: c.id for c in cat_rows}
        existing_slugs = {s for (s,) in (await db.execute(select(Destination.slug))).all()}

        async with FreePlacesService(db) as svc:
            # ── 1) Enrich existing destinations with dead images ──
            dests = (await db.execute(select(Destination).order_by(Destination.rating_avg.desc()))).scalars().all()
            enriched = 0
            for d in dests:
                real = d.images and any("source.unsplash" not in (i or "") for i in d.images)
                if real:
                    continue
                img, desc = await svc.resolve_image(d.name, d.city)
                if img:
                    d.images = [img]
                    if not d.description and desc:
                        d.description = desc[:500]
                    enriched += 1
                    print(f"  enrich: {d.name} -> {img[:70]}")
                else:
                    print(f"  enrich: {d.name} -> NO IMAGE")
                await asyncio.sleep(0.5)
            print(f"\nExisting enriched: {enriched}")

            # ── 2) Insert curated POIs ──
            inserted = 0
            for name, cat_slug, city, rating, reviews, tags in CURATED:
                slug = _slug(f"{name}-{city}")
                if slug in existing_slugs:
                    continue
                existing_slugs.add(slug)
                img, desc = await svc.resolve_image(name, city)
                # geocode for accurate coords
                geo = await svc.geocode(f"{name} {city}")
                lat = geo["lat"] if geo else -8.4
                lon = geo["lon"] if geo else 115.2
                price = _price_from_rating(rating)
                db.add(Destination(
                    name=name, slug=slug,
                    category_id=cat_by_slug.get(cat_slug),
                    latitude=lat, longitude=lon,
                    country="Indonesia", city=city,
                    description=desc[:500] if desc else None,
                    images=[img] if img else [],
                    tags=tags,
                    price_level=price,
                    rating_avg=rating, review_count=reviews, is_active=True,
                ))
                inserted += 1
                print(f"  add: {name} ({cat_slug}) rating={rating} img={'yes' if img else 'no'}")
                await asyncio.sleep(0.5)

            await db.commit()
            print(f"\nCurated inserted: {inserted}")
            print(f"Total real-image destinations now enriched.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
