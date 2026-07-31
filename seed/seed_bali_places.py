"""Seed Bali restaurant/hotel/tourist data from /home/ananda/restaurant_hotel_data.

Maps the 366-record dataset (kuliner, penginapan, wisata, pantai, budaya, alam)
into Poca destinations. Adds two new categories (Penginapan, Wisata); the rest
map to existing ones. Idempotent: skips records whose slug already exists.
"""
import asyncio
import json
import re
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from src.core.config import settings
from src.core.database import Base
from src.domain.models.destination import Category, Destination

DATA_PATH = "/home/ananda/restaurant_hotel_data/processed/combined_data.json"

# category in dataset -> (poca slug, create if missing)
CAT_MAP = {
    "kuliner": ("kuliner", False),
    "penginapan": ("penginapan", True),
    "wisata": ("wisata", True),
    "pantai": ("pantai", False),
    "budaya": ("budaya", False),
    "alam": ("alam", False),
}

# Bali area -> approximate coordinates
AREA_COORDS = {
    "Balangan": (-8.7995, 115.1275),
    "Bangli": (-8.4540, 115.3544),
    "Buleleng": (-8.1150, 115.0920),
    "Canggu": (-8.6461, 115.1358),
    "Denpasar": (-8.6500, 115.2167),
    "Gianyar": (-8.5449, 115.3227),
    "Jimbaran": (-8.7907, 115.1600),
    "Karangasem": (-8.4625, 115.6036),
    "Klungkung": (-8.5359, 115.4037),
    "Kuta": (-8.7239, 115.1725),
    "Nusa Dua": (-8.7990, 115.2300),
    "Padang Padang": (-8.8424, 115.0950),
    "Sanur": (-8.6944, 115.2636),
    "Seminyak": (-8.6906, 115.1551),
    "Ubud": (-8.5069, 115.2625),
}

BUDGET_MAP = {"Ekonomis": "budget", "Menengah": "mid", "Mewah": "luxury"}


def _slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "tempat"


async def seed() -> None:
    engine = create_async_engine(settings.database_url, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    with open(DATA_PATH) as f:
        records = json.load(f)

    async with session_factory() as db:
        # Idempotency: skip destinations whose name already exists in DB.
        existing_names = set((await db.execute(select(Destination.name))).scalars().all())

        # Categories.
        cats = {c.slug: c.id for c in (await db.execute(select(Category))).scalars()}
        added_cats = []
        for _, (slug, create) in CAT_MAP.items():
            if slug not in cats and create:
                cat = Category(name=slug.capitalize(), slug=slug)
                db.add(cat)
                await db.flush()
                cats[slug] = cat.id
                added_cats.append(slug)

        count = 0
        skipped = 0
        for r in records:
            name = r.get("name", "")
            if name in existing_names:
                skipped += 1
                continue
            existing_names.add(name)

            cat_slug = CAT_MAP.get(r.get("category"), (None, False))[0]
            if not cat_slug or cat_slug not in cats:
                skipped += 1
                continue

            slug = _slug(name)
            loc = r.get("location") or "Denpasar"
            lat, lng = AREA_COORDS.get(loc, (-8.6500, 115.2167))

            # Rich tags from dataset-specific fields.
            tags = [t for t in [r.get("type"), r.get("cuisine"), r.get("halal")] if t]
            if r.get("has_pork") == "Yes":
                tags.append("mengandung babi")
            if r.get("stars"):
                tags.append(f"{r['stars']} bintang")
            if r.get("facilities"):
                tags.append(r["facilities"])

            desc = r.get("description")
            if not desc and r.get("type"):
                desc = f"Tempat {r['type']} di {loc}, Bali."

            dest = Destination(
                id=uuid.uuid4(),
                category_id=cats[cat_slug],
                slug=slug,
                name=r.get("name", "Tempat"),
                description=desc,
                latitude=lat,
                longitude=lng,
                country="Indonesia",
                city=loc,
                address=r.get("address"),
                images=[],
                tags=tags,
                price_level=BUDGET_MAP.get(r.get("budget"), "mid"),
                rating_avg=r.get("rating") or 0.0,
                review_count=0,
                opening_hours={"price_range": r.get("price_range") or r.get("entrance_fee") or None},
                local_tips={"customs": [], "food": [], "hidden_gems": []},
                seasonal_info={"best_months": "April-October", "avoid_months": "December-February"},
            )
            db.add(dest)
            count += 1

        await db.commit()

    print(f"Seed Bali places complete!")
    print(f"  Added: {count} destinations")
    print(f"  Skipped: {skipped} (missing category)")
    print(f"  New categories: {', '.join(added_cats) or 'none'}")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
