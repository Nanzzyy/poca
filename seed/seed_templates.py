"""Seed default page templates (Temple, Beach, Mountain, Cultural). Idempotent: overwrites existing by id."""
import asyncio

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from src.core.config import settings
from src.domain.models.template import PageTemplate


TEMPLATES = [
    {
        "id": "temple",
        "name": "Temple Template",
        "description": "For Hindu/Buddhist temples with ceremony info",
        "sections": [
            {"type": "hero-gallery", "order": 0, "required": True},
            {"type": "rich-text", "order": 1, "defaults": {"heading": "About this Temple"}},
            {"type": "info-cards", "order": 2, "defaults": {"cards": [
                {"icon": "clock", "label": "Open Hours", "value": "07:00 - 18:00"},
                {"icon": "dollar", "label": "Entrance Fee", "value": "Rp 50,000"},
                {"icon": "umbrella", "label": "Dress Code", "value": "Sarong required"},
            ]}},
            {"type": "guide-cards", "order": 3},
            {"type": "timeline", "order": 4, "defaults": {"heading": "Suggested Itinerary"}},
            {"type": "map", "order": 5, "required": True},
            {"type": "reviews", "order": 6, "required": True},
        ],
    },
    {
        "id": "beach",
        "name": "Beach Template",
        "description": "For beaches, islands, and coastal spots",
        "sections": [
            {"type": "hero-gallery", "order": 0, "required": True},
            {"type": "rich-text", "order": 1, "defaults": {"heading": "About this Beach"}},
            {"type": "info-cards", "order": 2, "defaults": {"cards": [
                {"icon": "clock", "label": "Best Time", "value": "06:00 - 18:00"},
                {"icon": "dollar", "label": "Entrance Fee", "value": "Rp 10,000"},
                {"icon": "umbrella", "label": "Facilities", "value": "Restrooms, cafes, parking"},
            ]}},
            {"type": "image-grid", "order": 3, "defaults": {"columns": 3}},
            {"type": "guide-cards", "order": 4},
            {"type": "map", "order": 5, "required": True},
            {"type": "reviews", "order": 6, "required": True},
        ],
    },
    {
        "id": "mountain",
        "name": "Mountain Template",
        "description": "For mountains, volcanoes, and hiking destinations",
        "sections": [
            {"type": "hero-gallery", "order": 0, "required": True},
            {"type": "rich-text", "order": 1, "defaults": {"heading": "About this Mountain"}},
            {"type": "info-cards", "order": 2, "defaults": {"cards": [
                {"icon": "zap", "label": "Difficulty", "value": "Moderate"},
                {"icon": "compass", "label": "Elevation", "value": "1,700 m"},
                {"icon": "dollar", "label": "Entrance Fee", "value": "Rp 20,000"},
            ]}},
            {"type": "timeline", "order": 3, "defaults": {"heading": "Hiking Route"}},
            {"type": "guide-cards", "order": 4},
            {"type": "map", "order": 5, "required": True},
            {"type": "reviews", "order": 6, "required": True},
        ],
    },
    {
        "id": "cultural",
        "name": "Cultural Template",
        "description": "For cultural sites, museums, and heritage areas",
        "sections": [
            {"type": "hero-gallery", "order": 0, "required": True},
            {"type": "rich-text", "order": 1, "defaults": {"heading": "About this Place"}},
            {"type": "info-cards", "order": 2, "defaults": {"cards": [
                {"icon": "clock", "label": "Schedule", "value": "09:00 - 17:00"},
                {"icon": "dollar", "label": "Entrance Fee", "value": "Rp 30,000"},
            ]}},
            {"type": "image-grid", "order": 3, "defaults": {"columns": 3}},
            {"type": "timeline", "order": 4, "defaults": {"heading": "History & Timeline"}},
            {"type": "cta-banner", "order": 5, "defaults": {"heading": "Plan Your Visit", "button_text": "Book a Guide"}},
            {"type": "map", "order": 6, "required": True},
            {"type": "reviews", "order": 7, "required": True},
        ],
    },
]


async def seed() -> None:
    engine = create_async_engine(settings.database_url)
    async with AsyncSession(engine, expire_on_commit=False) as db:
        for t in TEMPLATES:
            existing = await db.get(PageTemplate, t["id"])
            if existing:
                existing.name = t["name"]
                existing.description = t["description"]
                existing.sections = t["sections"]
                existing.is_default = t["id"] == "temple"  # temple as the default
            else:
                db.add(PageTemplate(
                    id=t["id"], name=t["name"], description=t["description"],
                    sections=t["sections"], is_default=t["id"] == "temple",
                ))
        await db.commit()

    print(f"Seed complete: {len(TEMPLATES)} templates (temple set as default)")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
