"""Free POI collector via Wikidata SPARQL — coords + real place images, no key.

Companion to collect_places_overpass.py. Wikidata gives us coordinates AND a
Wikimedia Commons image (P18) for notable places, which OSM cannot. We harvest
by region bbox, then fall back to Wikipedia REST for the lead image when P18 is
missing. Output is a JSON dump + optional DB seed using the same pattern as the
Overpass collector.

Usage:
  PYTHONPATH=. .venv/bin/python -m seed.collect_places_wikidata                 # dump JSON
  PYTHONPATH=. .venv/bin/python -m seed.collect_places_wikidata --seed          # also seed DB
  PYTHONPATH=. .venv/bin/python -m seed.collect_places_wikidata --regions Bali,Yogyakarta
  PYTHONPATH=. .venv/bin/python -m seed.collect_places_wikidata --buckets wisata,resto
"""
from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from pathlib import Path

import httpx

from seed.collect_places_overpass import REGIONS, _slug, _price_from_stars  # reuse bbox + helpers

# Wikidata instance-of (P31) values per Poca bucket.
BUCKET_INSTANCES: dict[str, list[str]] = {
    "wisata": [
        "Q570116",    # tourist attraction
        "Q40080",     # beach
        "Q811979",    # landmark
        "Q23442",     # island
        "Q515",       # museum
        "Q41176",     # building
    ],
    "penginapan": [
        "Q27686",     # hotel
        "Q11707",     # resort
        "Q434 supra", # guest house placeholder removed below
    ],
    "resto": [
        "Q11707",     # restaurant
    ],
}
# Clean any accidental placeholder tokens.
BUCKET_INSTANCES = {k: [v for v in vals if re.match(r"^Q\d+$", v)] for k, vals in BUCKET_INSTANCES.items()}

WIKIDATA_SPARQL = "https://query.wikidata.org/sparql"
WIKIPEDIA_SUMMARY = "https://id.wikipedia.org/api/rest_v1/page/summary/"
COMMONS_BASE = "https://commons.wikimedia.org/wiki/Special:FilePath/"
USER_AGENT = "Poca-POI/1.0 (tourism seed)"
OUT_DIR = Path(__file__).resolve().parent / "data"


def _bbox_filter(bbox: tuple[float, float, float, float]) -> str:
    s, w, n, e = bbox
    # Wikidata coordinate location uses Point(lon lat). Service box = (lon lat lon lat).
    return f'BIND(BOUNDARY(?coord)) . FILTER(geof:bfIntersects(?coord, "{w} {s} {e} {n}"^^geo:wktLiteral))'


def _commons_url(filename: str | None, width: int = 800) -> str | None:
    if not filename:
        return None
    name = filename.strip()
    if name.lower().startswith("file:"):
        name = name[5:]
    from urllib.parse import quote
    return f"{COMMONS_BASE}{quote(name)}?width={width}"


def build_query(bucket: str, bbox: tuple[float, float, float, float], limit: int) -> str:
    instances = " ".join(f"wd:{qid}" for qid in BUCKET_INSTANCES[bucket])
    s, w, n, e = bbox
    return f"""
SELECT ?item ?itemLabel ?coord ?image ?desc ?sitelink WHERE {{
  VALUES ?type {{ {instances} }}
  ?item wdt:P31 ?type ;
        wdt:P17 wd:Q252 ;
        wdt:P625 ?coord .
  OPTIONAL {{ ?item wdt:P18 ?image . }}
  OPTIONAL {{ ?item schema:description ?desc . FILTER(LANG(?desc) = "id") }}
  OPTIONAL {{ ?sitelink schema:about ?item ; schema:isPartOf <https://id.wikipedia.org/> . }}
  FILTER(geof:bfIntersects(?coord, "Point({w} {s} {e} {n})"^^geo:wktLiteral))
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "id,en". }}
}}
LIMIT {limit}
"""


def _parse_coord(point: str) -> tuple[float, float] | None:
    # "Point(115.1686 -8.7186)" → (lat, lon)
    m = re.search(r"Point\(([-\d.]+)\s+([-\d.]+)\)", point or "")
    if not m:
        return None
    lon, lat = float(m.group(1)), float(m.group(2))
    return lat, lon


def to_record(row: dict, region: str, bucket: str) -> dict | None:
    label = row.get("itemLabel", {}).get("value")
    coord_raw = row.get("coord", {}).get("value")
    if not label or not coord_raw:
        return None
    coords = _parse_coord(coord_raw)
    if not coords:
        return None
    lat, lon = coords
    image = _commons_url(row.get("image", {}).get("value"))
    sitelink = row.get("sitelink", {}).get("value")
    return {
        "name": str(label).strip(),
        "bucket": bucket,
        "region": region,
        "city": region,
        "country": "Indonesia",
        "lat": round(lat, 6),
        "lon": round(lon, 6),
        "image_url": image,
        "description": row.get("desc", {}).get("value"),
        "wikipedia": sitelink,
        "notable": bool(image or sitelink),
        "source": "wikidata" if image else "osm",
        "osm": None,
        "tags": {k: v for k, v in row.get("tags", {}).items()} if False else [],
    }


async def sparql(client: httpx.AsyncClient, query: str) -> list[dict]:
    try:
        r = await client.get(
            WIKIDATA_SPARQL,
            params={"query": query, "format": "json"},
            headers={"User-Agent": USER_AGENT, "Accept": "application/sparql-results+json"},
            timeout=90,
        )
        if r.status_code != 200:
            print(f"  [wikidata HTTP {r.status_code}] (rate-limited or blocked; retry later)", file=sys.stderr)
            return []
        return (r.json() or {}).get("results", {}).get("bindings", [])
    except Exception as e:
        print(f"  [wikidata error: {e}]", file=sys.stderr)
        return []


async def wikipedia_fallback(client: httpx.AsyncClient, record: dict) -> dict:
    """Fill image + description from id-Wikipedia when Wikidata had no image."""
    if record.get("image_url"):
        return record
    title = record["name"]
    try:
        r = await client.get(WIKIPEDIA_SUMMARY + __import__("urllib.parse", fromlist=["quote"]).quote(title))
        if r.status_code != 200:
            return record
        data = r.json() or {}
        img = data.get("originalimage", {}).get("source") or data.get("thumbnail", {}).get("source")
        if img:
            record["image_url"] = img
            record["source"] = "wikipedia"
        if not record.get("description") and data.get("extract"):
            record["description"] = data["extract"]
    except Exception:
        pass
    return record


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


async def collect(regions: list[str], buckets: list[str], limit: int = 200) -> list[dict]:
    records: list[dict] = []
    async with httpx.AsyncClient() as client:
        for region in regions:
            bbox = REGIONS[region]
            for bucket in buckets:
                rows = await sparql(client, build_query(bucket, bbox, limit))
                got = [r for row in rows if (r := to_record(row, region, bucket))]
                # Wikipedia image fallback for rows missing a Wikidata image.
                for i, rec in enumerate(got):
                    got[i] = await wikipedia_fallback(client, rec)
                    await asyncio.sleep(0.5)
                print(f"  {region:<12} {bucket:<10} bindings={len(rows):<4} named={len(got)}")
                records.extend(got)
                await asyncio.sleep(1.0)
    return dedup(records)


async def seed_db(records: list[dict]) -> dict:
    from sqlalchemy import select
    from src.core.database import async_session_factory
    from src.domain.models.destination import Category, Destination

    bucket_cat = {"wisata": "Wisata", "penginapan": "Penginapan", "resto": "Restoran"}
    inserted = skipped = 0
    async with async_session_factory() as db:
        cat_map: dict[str, int] = {}
        for cname in bucket_cat.values():
            row = (await db.execute(select(Category).where(Category.slug == _slug(cname)))).scalar_one_or_none()
            if not row:
                row = Category(name=cname, slug=_slug(cname), icon="map-pin")
                db.add(row)
                await db.flush()
            cat_map[cname] = row.id

        existing_slugs = {s for (s,) in (await db.execute(select(Destination.slug))).all()}
        for r in records:
            slug = _slug(f"{r['name']}-{r['city']}")
            if slug in existing_slugs:
                skipped += 1
                continue
            existing_slugs.add(slug)
            images = [r["image_url"]] if r.get("image_url") else []
            db.add(Destination(
                name=r["name"], slug=slug,
                category_id=cat_map[bucket_cat[r["bucket"]]],
                latitude=r["lat"], longitude=r["lon"],
                country=r["country"], city=r["city"],
                description=r.get("description"),
                images=images,
                tags=[r["bucket"], r["region"]] + ([r["region"]] if r["region"] != r["city"] else []),
                price_level="mid",
                rating_avg=0.0, review_count=0, is_active=True,
            ))
            inserted += 1
        await db.commit()
    return {"inserted": inserted, "skipped_dup": skipped, "with_image": sum(1 for r in records if r.get("image_url"))}


async def main() -> int:
    ap = argparse.ArgumentParser(description="Collect Indonesian POIs from Wikidata (free, with images).")
    ap.add_argument("--regions", default=",".join(REGIONS))
    ap.add_argument("--buckets", default=",".join(BUCKET_INSTANCES))
    ap.add_argument("--limit", type=int, default=200)
    ap.add_argument("--seed", action="store_true")
    ap.add_argument("--notable-only", action="store_true", help="keep only POIs with image/wikipedia")
    args = ap.parse_args()

    regions = [r.strip() for r in args.regions.split(",") if r.strip() in REGIONS]
    buckets = [b.strip() for b in args.buckets.split(",") if b.strip() in BUCKET_INSTANCES]
    if not regions or not buckets:
        print("No valid regions/buckets.", file=sys.stderr)
        return 2

    print(f"Collecting {buckets} from {regions} via Wikidata SPARQL (free, with images)...")
    records = await collect(regions, buckets, args.limit)
    if args.notable_only:
        records = [r for r in records if r["notable"]]
        print(f"  notable-only filter -> {len(records)}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / "places_wikidata.json"
    out.write_text(json.dumps(records, ensure_ascii=False, indent=2))
    print(f"\nTotal unique: {len(records)} -> {out}")
    with_image = sum(1 for r in records if r.get("image_url"))
    print(f"With image: {with_image}/{len(records)}")

    if args.seed:
        res = await seed_db(records)
        print("DB seed:", res)
    else:
        print("Dry run (JSON only). Add --seed to insert into destinations table.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
