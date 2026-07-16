"""Free POI collector via Overpass API (OpenStreetMap) — no API key, no cost.

Collects wisata (attractions), penginapan (lodging), and resto (restaurants)
across Indonesian tourist regions. A free alternative to the paid Google
Places path.

LIMITATION — no ratings: OSM has no user-review ratings, so the "rating > 4"
filter CANNOT be honoured from this source (only Google/TripAdvisor/Foursquare
have ratings). We expose a `notable` flag (wikidata/wikipedia/website present)
as a quality proxy instead, and keep every collected field so you can enrich
ratings later from a paid source for a small subset only.

Usage:
  PYTHONPATH=. .venv/bin/python -m seed.collect_places_overpass              # dump JSON
  PYTHONPATH=. .venv/bin/python -m seed.collect_places_overpass --seed       # also seed DB
  PYTHONPATH=. .venv/bin/python -m seed.collect_places_overpass --regions Bali,Lombok
  PYTHONPATH=. .venv/bin/python -m seed.collect_places_overpass --buckets penginapan,resto
"""
from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from pathlib import Path

import httpx

# Overpass endpoints — the official host sometimes returns 406 without specific
# headers; rotate mirrors on failure.
MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

# bbox per region as (south, west, north, east) — approximate, good enough for harvest.
REGIONS: dict[str, tuple[float, float, float, float]] = {
    "Bali":         (-8.85, 114.44, -8.05, 115.71),
    "Lombok":       (-8.95, 115.81, -8.05, 116.65),
    "Yogyakarta":   (-8.18, 110.27, -7.48, 110.84),
    "Bandung":      (-7.10, 107.47, -6.75, 107.78),
    "Jakarta":      (-6.40, 106.69, -6.08, 107.05),
    "Raja Ampat":   (-0.55, 130.00, 0.05, 131.10),
    "Labuan Bajo":  (-8.65, 119.70, -8.30, 120.10),
    "Bromo":        (-7.98, 112.80, -7.72, 113.12),
    "Danau Toba":   (2.40, 98.45, 3.00, 99.35),
    "Toraja":       (-3.30, 118.80, -2.80, 119.15),
}

# Each bucket -> list of (osm_key, value_alternation). Matched as ^(a|b|c)$.
BUCKETS: dict[str, list[tuple[str, str]]] = {
    "wisata": [
        ("tourism", "attraction|viewpoint|theme_park|gallery|museum|zoo|aquarium|artwork"),
        ("historic", "monument|castle|ruins|memorial|archaeological_site|fort|wayside_shrine"),
        ("leisure", "park|nature_reserve|garden|beach_resort"),
    ],
    "penginapan": [
        ("tourism", "hotel|guest_house|resort|hostel|motel|apartment|chalet|bed_and_breakfast"),
    ],
    "resto": [
        ("amenity", "restaurant|cafe"),
    ],
}

LIMIT_PER_QUERY = 400
OUT_DIR = Path(__file__).resolve().parent / "data"


def build_query(filters: list[tuple[str, str]], bbox: tuple[float, float, float, float], limit: int) -> str:
    s, w, n, e = bbox
    parts: list[str] = []
    for key, vals in filters:
        for typ in ("node", "way"):
            parts.append(f'{typ}["{key}"~"^({vals})$"]({s},{w},{n},{e});')
    return f"[out:json][timeout:50];({' '.join(parts)});out center tags {limit};"


async def overpass(client: httpx.AsyncClient, query: str) -> list[dict]:
    data = {"data": query}
    headers = {"User-Agent": "Poca-POI-collector/1.0 (tourism seed)"}
    for url in MIRRORS:
        try:
            r = await client.post(url, data=data, headers=headers, timeout=90)
            if r.status_code == 200 and r.text.lstrip().startswith("{"):
                return r.json().get("elements", [])
        except Exception:
            continue
    return []


def _address(tags: dict) -> str | None:
    bits = [tags.get("addr:housenumber"), tags.get("addr:street")]
    line = " ".join(b for b in bits if b)
    city = tags.get("addr:city") or tags.get("addr:suburb")
    if line and city:
        return f"{line}, {city}"
    return line or city or None


def to_record(el: dict, region: str, bucket: str) -> dict | None:
    tags = el.get("tags") or {}
    name = tags.get("name")
    if not name:
        return None
    c = el.get("center") or el
    lat, lon = c.get("lat"), c.get("lon")
    if lat is None or lon is None:
        return None
    stars_raw = tags.get("stars")
    stars = None
    if stars_raw:
        m = re.search(r"\d", stars_raw)
        if m:
            stars = int(m.group())
    return {
        "name": name.strip(),
        "bucket": bucket,
        "region": region,
        "city": (tags.get("addr:city") or tags.get("addr:town") or tags.get("addr:village")
                 or tags.get("addr:county") or region),
        "country": "Indonesia",
        "lat": round(float(lat), 6),
        "lon": round(float(lon), 6),
        "address": _address(tags),
        "website": tags.get("website") or tags.get("contact:website") or tags.get("url"),
        "phone": tags.get("phone") or tags.get("contact:phone"),
        "cuisine": tags.get("cuisine"),
        "stars": stars,                # hotel class (1-5), NOT user rating
        "notable": bool(tags.get("wikidata") or tags.get("wikipedia") or tags.get("website")),
        "osm": f"{el.get('type')}/{el.get('id')}",
        "tags": {k: v for k, v in tags.items() if k in (
            "tourism", "historic", "leisure", "amenity", "cuisine", "stars", "internet_access",
            "wheelchair", "opening_hours", "outdoor_seating", "delivery")},
    }


def dedup(records: list[dict]) -> list[dict]:
    seen: set[tuple[str, float, float]] = set()
    out: list[dict] = []
    for r in records:
        key = (r["name"].lower(), round(r["lat"], 3), round(r["lon"], 3))
        if key in seen:
            continue
        seen.add(key)
        out.append(r)
    return out


async def collect(regions: list[str], buckets: list[str]) -> list[dict]:
    records: list[dict] = []
    async with httpx.AsyncClient() as client:
        for region in regions:
            bbox = REGIONS[region]
            for bucket in buckets:
                q = build_query(BUCKETS[bucket], bbox, LIMIT_PER_QUERY)
                els = await overpass(client, q)
                got = [r for el in els if (r := to_record(el, region, bucket))]
                print(f"  {region:<12} {bucket:<10} raw={len(els):<4} named={len(got)}")
                records.extend(got)
                await asyncio.sleep(1.0)  # be nice to the free mirrors
    return dedup(records)


# ---- optional DB seed -------------------------------------------------------
def _slug(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s or "place"


def _price_from_stars(stars: int | None) -> str:
    if stars is None:
        return "mid"
    return "luxury" if stars >= 4 else ("mid" if stars == 3 else "budget")


async def seed_db(records: list[dict]) -> dict:
    from sqlalchemy import select
    from src.core.database import async_session_factory
    from src.domain.models.destination import Category, Destination

    bucket_cat = {"wisata": "Wisata", "penginapan": "Penginapan", "resto": "Restoran"}
    inserted = 0
    skipped = 0
    async with async_session_factory() as db:
        # ensure the three collector categories exist
        cat_map: dict[str, int] = {}
        for cname in bucket_cat.values():
            row = (await db.execute(select(Category).where(Category.slug == _slug(cname)))).scalar_one_or_none()
            if not row:
                row = Category(name=cname, slug=_slug(cname), icon="map-pin")
                db.add(row)
                await db.flush()
            cat_map[cname] = row.id

        existing_slugs = {
            s for (s,) in (await db.execute(select(Destination.slug))).all()
        }

        for r in records:
            slug = _slug(f"{r['name']}-{r['city']}")
            if slug in existing_slugs:
                skipped += 1
                continue
            existing_slugs.add(slug)
            db.add(Destination(
                name=r["name"],
                slug=slug,
                category_id=cat_map[bucket_cat[r["bucket"]]],
                latitude=r["lat"],
                longitude=r["lon"],
                country=r["country"],
                city=r["city"],
                address=r["address"],
                images=[],
                tags=[r["bucket"], r["region"]] + ([r["cuisine"]] if r["cuisine"] else []),
                price_level=_price_from_stars(r.get("stars")),
                rating_avg=0.0,   # OSM has no rating — left empty by design
                review_count=0,
                is_active=True,
            ))
            inserted += 1
        await db.commit()
    return {"inserted": inserted, "skipped_dup": skipped}


async def main() -> int:
    ap = argparse.ArgumentParser(description="Collect Indonesian POIs from OpenStreetMap (free).")
    ap.add_argument("--regions", default=",".join(REGIONS), help="comma-separated region names")
    ap.add_argument("--buckets", default=",".join(BUCKETS), help="wisata,penginapan,resto")
    ap.add_argument("--seed", action="store_true", help="also insert into destinations table")
    ap.add_argument("--notable-only", action="store_true", help="keep only notable POIs (wikidata/website)")
    args = ap.parse_args()

    regions = [r.strip() for r in args.regions.split(",") if r.strip() in REGIONS]
    buckets = [b.strip() for b in args.buckets.split(",") if b.strip() in BUCKETS]
    if not regions or not buckets:
        print("No valid regions/buckets.", file=sys.stderr)
        return 2

    print(f"Collecting {buckets} from {regions} via Overpass (free, no key)...")
    records = await collect(regions, buckets)
    if args.notable_only:
        records = [r for r in records if r["notable"]]
        print(f"  notable-only filter -> {len(records)}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / "places_collected.json"
    out.write_text(json.dumps(records, ensure_ascii=False, indent=2))
    print(f"\nTotal unique: {len(records)} -> {out}")

    by_bucket: dict[str, int] = {}
    for r in records:
        by_bucket[r["bucket"]] = by_bucket.get(r["bucket"], 0) + 1
    print("By bucket:", by_bucket)

    if args.seed:
        res = await seed_db(records)
        print("DB seed:", res)
    else:
        print("Dry run (JSON only). Add --seed to insert into destinations table.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
