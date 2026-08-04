"""Free POI source — geocoding + images without API keys or cost.

Sources (all free, no key, ~1 req/s):
- Nominatim (OSM)         → geocode name→coords, reverse coords→address
- Wikidata SPARQL         → place image (P18), coordinates, description
- Wikipedia REST (id)     → lead image + summary fallback

Images are stored as Wikimedia thumbnail URLs (no file download).
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import re
import time
import urllib.parse
from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import async_session_factory
from src.core.redis import get_redis
from src.repositories.destination_repo import DestinationRepository

logger = logging.getLogger(__name__)

USER_AGENT = "Poca-POI/1.0 (tourism seed; contact admin)"
COMMONS_BASE = "https://commons.wikimedia.org/wiki/Special:FilePath/"
NOMINATIM_SEARCH = "https://nominatim.openstreetmap.org/search"
NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse"
LEGACY_IMAGE_HOST = "source.unsplash.com"
IMAGE_CACHE_TTL = 30 * 24 * 60 * 60
IMAGE_MISS_CACHE_TTL = 6 * 60 * 60
IMAGE_BATCH_CONCURRENCY = 4
NOMINATIM_MIN_INTERVAL = 1.0
_nominatim_lock = asyncio.Lock()
_nominatim_last_request = 0.0

# Generic seed coordinates — not a real location. The seed stored these for
# destinations without precise coords (e.g. 23 places pinned to Bali's center).
# enrich_destination must re-geocode these, not treat them as resolved.
GENERIC_COORDS = {(-8.4, 115.2)}


def coords_suspicious(lat: float | None, lng: float | None) -> bool:
    """True if coords are missing or match a known generic/placeholder seed point."""
    if not lat or not lng:
        return True
    return (round(lat, 2), round(lng, 2)) in GENERIC_COORDS


def has_real_image(images: list[str] | None) -> bool:
    """Return whether a destination has at least one usable image URL."""
    return any(image and LEGACY_IMAGE_HOST not in image for image in (images or []))
WIKIDATA_SPARQL = "https://query.wikidata.org/sparql"
WIKIPEDIA_SUMMARY = "https://id.wikipedia.org/api/rest_v1/page/summary/"
WIKIPEDIA_SEARCH = "https://id.wikipedia.org/w/api.php"


def commons_url(filename: str | None, width: int = 800) -> str | None:
    """Convert a Wikimedia Commons filename to a thumbnail URL."""
    if not filename:
        return None
    name = filename.strip()
    if name.startswith("http"):
        return name
    # Drop any "File:" prefix the source may carry.
    if name.lower().startswith("file:"):
        name = name[5:]
    return f"{COMMONS_BASE}{urllib.parse.quote(name)}?width={width}"


class FreePlacesService:
    """Geocode POIs and resolve real place images from free sources."""

    def __init__(self, db: AsyncSession | None = None, client: httpx.AsyncClient | None = None):
        self.db = db
        self.repo = DestinationRepository(db) if db else None
        self._client = client
        self._owns_client = client is None
        self._redis = get_redis()

    async def _aclose(self):
        if self._owns_client and self._client is not None:
            await self._client.aclose()
            self._client = None

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        await self._aclose()

    async def _http(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                headers={"User-Agent": USER_AGENT}, timeout=30, follow_redirects=True
            )
        return self._client

    async def _nominatim_get(self, client: httpx.AsyncClient, url: str, **kwargs) -> httpx.Response:
        """Respect Nominatim's public-service limit across concurrent enrich tasks."""
        global _nominatim_last_request
        async with _nominatim_lock:
            wait = NOMINATIM_MIN_INTERVAL - (time.monotonic() - _nominatim_last_request)
            if wait > 0:
                await asyncio.sleep(wait)
            response = await client.get(url, **kwargs)
            _nominatim_last_request = time.monotonic()
            return response

    # ── Nominatim ──────────────────────────────────────────────────────

    async def geocode(self, query: str, country: str = "Indonesia") -> dict | None:
        """Name → {lat, lon, address, city} via Nominatim.

        Nominatim's `country` filter is restrictive and often returns nothing for
        tourist sites whose address lacks a clean country match, so we search
        without it (the query already carries the place name + city/region) and
        fall back to name-only if the combined query misses.
        """
        client = await self._http()

        async def _lookup(q: str) -> dict | None:
            params = {"q": q, "format": "jsonv2", "limit": 1, "addressdetails": 1}
            try:
                r = await self._nominatim_get(client, NOMINATIM_SEARCH, params=params)
                if r.status_code != 200:
                    return None
                data = (r.json() or [None])[0]
            except Exception:
                logger.warning("Nominatim geocode failed for %r", q, exc_info=True)
                return None
            return data or None

        data = await _lookup(query)
        if not data:
            # Combined "name city" can over-constrain — retry with the name only
            # (drop the trailing city token, keep the leading place name).
            tokens = query.split()
            for end in range(len(tokens) - 1, 0, -1):
                candidate = " ".join(tokens[:end])
                if candidate and candidate != query:
                    data = await _lookup(candidate)
                    if data:
                        break
        if not data:
            return None
        addr = data.get("address", {})
        city = addr.get("city") or addr.get("town") or addr.get("village") or addr.get("county")
        line = " ".join(b for b in (addr.get("road"), addr.get("house_number")) if b)
        return {
            "lat": float(data["lat"]),
            "lon": float(data["lon"]),
            "address": f"{line}, {city}" if line and city else (city or data.get("display_name")),
            "city": city,
        }

    async def reverse(self, lat: float, lon: float) -> str | None:
        client = await self._http()
        try:
            r = await self._nominatim_get(
                client,
                NOMINATIM_REVERSE,
                params={"format": "jsonv2", "lat": lat, "lon": lon},
            )
            if r.status_code != 200:
                return None
            return (r.json() or {}).get("display_name")
        except Exception:
            return None

    # ── Image resolution ───────────────────────────────────────────────

    async def _wikidata_image(self, name: str) -> tuple[str | None, str | None]:
        """Return (commons_image_url, description) from Wikidata by label."""
        client = await self._http()
        sparql = (
            "SELECT ?item ?itemLabel ?image ?desc WHERE {\n"
            f'  ?item rdfs:label "{name}"@id .\n'
            "  ?item wdt:P17 wd:Q252 .\n"           # country = Indonesia
            "  OPTIONAL { ?item wdt:P18 ?image . }\n"
            "  OPTIONAL { ?item schema:description ?desc . FILTER(LANG(?desc) = \"id\") }\n"
            "  SERVICE wikibase:label { bd:serviceParam wikibase:language \"id,en\". }\n"
            "} LIMIT 1"
        )
        try:
            r = await client.get(
                WIKIDATA_SPARQL,
                params={"query": sparql, "format": "json"},
                headers={"Accept": "application/sparql-results+json"},
            )
            if r.status_code != 200:
                return None, None
            bindings = (r.json() or {}).get("results", {}).get("bindings", [])
        except Exception:
            logger.warning("Wikidata query failed for %r", name, exc_info=True)
            return None, None
        if not bindings:
            return None, None
        b = bindings[0]
        return commons_url(b.get("image", {}).get("value")), b.get("desc", {}).get("value")

    async def _wikipedia_search_title(self, name: str, lang: str = "id") -> str | None:
        """Find the best Wikipedia article title for a freeform place name."""
        client = await self._http()
        base = f"https://{lang}.wikipedia.org/w/api.php"
        try:
            r = await client.get(base, params={
                "action": "query", "list": "search", "srsearch": name,
                "srnamespace": "0", "srlimit": 1, "format": "json",
            })
            if r.status_code != 200:
                return None
            hits = (r.json() or {}).get("query", {}).get("search", [])
            return hits[0]["title"] if hits else None
        except Exception:
            return None

    async def _wikipedia_image(self, title: str, lang: str = "id") -> tuple[str | None, str | None]:
        """Return (lead_image_url, summary) from Wikipedia by exact article title."""
        client = await self._http()
        base = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/"
        try:
            r = await client.get(base + urllib.parse.quote(title))
            if r.status_code != 200:
                return None, None
            data = r.json() or {}
        except Exception:
            return None, None
        if data.get("type") == "disambiguation":
            return None, None
        img = data.get("originalimage", {}).get("source") or data.get("thumbnail", {}).get("source")
        return img, data.get("extract")

    def _image_cache_key(self, name: str, city: str | None) -> str:
        query = f"{name.strip().lower()}|{(city or '').strip().lower()}"
        digest = hashlib.sha256(query.encode()).hexdigest()[:24]
        return f"poca:free-image:{digest}"

    async def _resolve_image_uncached(self, name: str, city: str | None = None) -> tuple[str | None, str | None]:
        """Resolve the cheapest/fastest sources first, then broaden search."""
        clean = re.sub(
            r"\s+(temple|candi|beach|pantai|island|pulau|museum|volcano|waterfall|rice terrace|marine park)$",
            "", name, flags=re.I,
        )

        # Most well-known places have an exact Wikipedia article. This avoids
        # the much slower Wikidata SPARQL query and multiple search round trips.
        for lang in ("id", "en"):
            for query in dict.fromkeys((name, clean)):
                img, desc = await self._wikipedia_image(query, lang)
                if img:
                    return img, desc

        # Wikidata Commons image is a good fallback, but SPARQL is slower.
        img, desc = await self._wikidata_image(name)
        if img:
            return img, desc

        # Last resort: one search per language, rather than trying six query
        # combinations for every destination.
        search_query = f"{name} {city}" if city else name
        for lang in ("id", "en"):
            title = await self._wikipedia_search_title(search_query, lang)
            if not title:
                continue
            img, desc = await self._wikipedia_image(title, lang)
            if img:
                return img, desc
        return None, None

    async def resolve_image(self, name: str, city: str | None = None) -> tuple[str | None, str | None]:
        """Resolve and cache a destination image lookup."""
        cache_key = self._image_cache_key(name, city)
        if self._redis:
            try:
                raw = await self._redis.get(cache_key)
                if raw is not None:
                    cached = json.loads(raw)
                    return cached.get("image"), cached.get("description")
            except Exception:
                logger.debug("Free image cache read failed", exc_info=True)

        result = await self._resolve_image_uncached(name, city)
        if self._redis:
            try:
                await self._redis.set(
                    cache_key,
                    json.dumps({"image": result[0], "description": result[1]}),
                    ex=IMAGE_CACHE_TTL if result[0] else IMAGE_MISS_CACHE_TTL,
                )
            except Exception:
                logger.debug("Free image cache write failed", exc_info=True)
        return result

    # ── Admin search ───────────────────────────────────────────────────

    async def search_places(self, query: str, lat: float | None = None,
                            lng: float | None = None, limit: int = 10) -> list[dict]:
        client = await self._http()
        params = {"q": query, "format": "jsonv2", "limit": limit, "addressdetails": 1}
        if lat is not None and lng is not None:
            params["lat"], params["lon"] = lat, lng
        try:
            r = await self._nominatim_get(client, NOMINATIM_SEARCH, params=params)
            if r.status_code != 200:
                return []
            rows = r.json() or []
        except Exception:
            return []
        out: list[dict] = []
        for row in rows:
            addr = row.get("address", {})
            city = addr.get("city") or addr.get("town") or addr.get("village") or addr.get("county")
            name = row.get("name") or row.get("display_name", "").split(",")[0]
            image, _ = await self.resolve_image(name, city)
            out.append({
                "name": name,
                "lat": float(row["lat"]),
                "lng": float(row["lon"]),
                "address": row.get("display_name"),
                "city": city,
                "category": row.get("category"),
                "type": row.get("type"),
                "image_url": image,
                "source": "wikimedia" if image else "osm",
            })
        return out

    # ── Enrich existing destination ────────────────────────────────────

    async def enrich_destination(self, dest_id: str) -> dict[str, Any]:
        if not self.repo:
            raise ValueError("DB session required for enrich")
        dest = await self.repo.get_by_id(dest_id)
        if not dest:
            raise ValueError(f"Destination {dest_id} not found")

        coords_resolved = False
        if coords_suspicious(dest.latitude, dest.longitude):
            geo = await self.geocode(f"{dest.name} {dest.city or ''}".strip())
            if geo:
                dest.latitude, dest.longitude = geo["lat"], geo["lon"]
                if not dest.address and geo.get("address"):
                    dest.address = geo["address"]
                coords_resolved = True
                await asyncio.sleep(1.0)

        image_added = has_real_image(dest.images)
        source = None
        current = list(dest.images or [])
        if len(current) < 3:
            image, desc = await self.resolve_image(dest.name, dest.city)
            if image and image not in current:
                current.append(image)
                dest.images = current[:3]
                image_added = True
                source = "wikidata" if "commons.wikimedia.org" in image else (
                    "wikipedia" if "upload.wikimedia.org" in image else None
                )
            if desc and not dest.description:
                dest.description = desc

        if self.db and (image_added or coords_resolved):
            await self.db.flush()
        return {
            "status": "enriched" if image_added else "no_image",
            "image_added": image_added,
            "coords_resolved": coords_resolved,
            "source": source,
            "images": dest.images or [],
        }

    async def enrich_all_without_images(self, size: int = 20, page: int = 1) -> list[dict]:
        if not self.repo:
            return []
        dests, _ = await self.repo.search(size=size, page=page)
        candidates = [dest for dest in dests if not has_real_image(dest.images)]
        if not candidates:
            return []

        # Each task gets its own AsyncSession. The shared HTTP client and Redis
        # cache keep network work cheap, while the semaphore avoids hammering
        # Wikimedia/Wikidata and keeps memory bounded for larger datasets.
        client = await self._http()
        semaphore = asyncio.Semaphore(IMAGE_BATCH_CONCURRENCY)

        async def enrich_one(dest) -> dict:
            async with semaphore:
                async with async_session_factory() as session:
                    try:
                        async with FreePlacesService(session, client=client) as svc:
                            result = await svc.enrich_destination(str(dest.id))
                        await session.commit()
                        return {"name": dest.name, "id": str(dest.id), **result}
                    except Exception as exc:
                        await session.rollback()
                        logger.warning("Batch enrich failed for %s (%s)", dest.name, dest.id, exc_info=True)
                        return {
                            "name": dest.name,
                            "id": str(dest.id),
                            "status": "error",
                            "image_added": False,
                            "coords_resolved": False,
                            "source": None,
                            "images": dest.images or [],
                            "error": str(exc),
                        }

        return list(await asyncio.gather(*(enrich_one(dest) for dest in candidates)))
