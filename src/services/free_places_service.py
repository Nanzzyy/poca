"""Free POI source — geocoding + images without API keys or cost.

Sources (all free, no key, ~1 req/s):
- Nominatim (OSM)         → geocode name→coords, reverse coords→address
- Wikidata SPARQL         → place image (P18), coordinates, description
- Wikipedia REST (id)     → lead image + summary fallback

Images are stored as Wikimedia thumbnail URLs (no file download).
"""
from __future__ import annotations

import asyncio
import logging
import re
import urllib.parse
from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from src.repositories.destination_repo import DestinationRepository

logger = logging.getLogger(__name__)

USER_AGENT = "Poca-POI/1.0 (tourism seed; contact admin)"
COMMONS_BASE = "https://commons.wikimedia.org/wiki/Special:FilePath/"
NOMINATIM_SEARCH = "https://nominatim.openstreetmap.org/search"
NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse"
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

    # ── Nominatim ──────────────────────────────────────────────────────

    async def geocode(self, query: str, country: str = "Indonesia") -> dict | None:
        """Name → {lat, lon, address, city} via Nominatim."""
        client = await self._http()
        params = {"q": query, "format": "jsonv2", "limit": 1, "addressdetails": 1}
        if country:
            params["country"] = country
        try:
            r = await client.get(NOMINATIM_SEARCH, params=params)
            if r.status_code != 200:
                return None
            data = (r.json() or [{}])[0] if r.json() else {}
        except Exception:
            logger.warning("Nominatim geocode failed for %r", query, exc_info=True)
            return None
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
            r = await client.get(
                NOMINATIM_REVERSE, params={"format": "jsonv2", "lat": lat, "lon": lon}
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

    async def _wikipedia_image(self, title: str) -> tuple[str | None, str | None]:
        """Return (lead_image_url, summary) from id-Wikipedia by exact article title."""
        client = await self._http()
        try:
            r = await client.get(WIKIPEDIA_SUMMARY + urllib.parse.quote(title))
            if r.status_code != 200:
                return None, None
            data = r.json() or {}
        except Exception:
            return None, None
        if data.get("type") == "disambiguation":
            return None, None
        img = data.get("originalimage", {}).get("source") or data.get("thumbnail", {}).get("source")
        return img, data.get("extract")

    async def _wikipedia_search_title(self, name: str) -> str | None:
        """Find the best id-Wikipedia article title for a freeform place name."""
        client = await self._http()
        try:
            r = await client.get(WIKIPEDIA_SEARCH, params={
                "action": "query", "list": "search", "srsearch": name,
                "srnamespace": "0", "srlimit": 1, "format": "json",
            })
            if r.status_code != 200:
                return None
            hits = (r.json() or {}).get("query", {}).get("search", [])
            return hits[0]["title"] if hits else None
        except Exception:
            return None

    async def resolve_image(self, name: str, city: str | None = None) -> tuple[str | None, str | None]:
        """Wikidata first, Wikipedia fallback (via search). Returns (image_url, description)."""
        img, desc = await self._wikidata_image(name)
        if img:
            return img, desc
        # Strip common suffixes and let Wikipedia search resolve the real article title.
        clean = re.sub(r"\s+(temple|candi|beach|pantai|island|pulau|museum)$", "", name, flags=re.I)
        for query in (name, clean, f"{name} {city}" if city else None):
            if not query:
                continue
            title = await self._wikipedia_search_title(query)
            if not title:
                continue
            img, desc = await self._wikipedia_image(title)
            if img:
                return img, desc
        return None, None

    # ── Admin search ───────────────────────────────────────────────────

    async def search_places(self, query: str, lat: float | None = None,
                            lng: float | None = None, limit: int = 10) -> list[dict]:
        client = await self._http()
        params = {"q": query, "format": "jsonv2", "limit": limit, "addressdetails": 1}
        if lat is not None and lng is not None:
            params["lat"], params["lon"] = lat, lng
        try:
            r = await client.get(NOMINATIM_SEARCH, params=params)
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
            await asyncio.sleep(1.0)  # respect Nominatim/Wikimedia rate limit
        return out

    # ── Enrich existing destination ────────────────────────────────────

    async def enrich_destination(self, dest_id: str) -> dict[str, Any]:
        if not self.repo:
            raise ValueError("DB session required for enrich")
        dest = await self.repo.get_by_id(dest_id)
        if not dest:
            raise ValueError(f"Destination {dest_id} not found")

        def _has_real_image(imgs):
            return bool(imgs) and not all("source.unsplash" in (i or "") for i in imgs)

        coords_resolved = False
        if (not dest.latitude or not dest.longitude) and dest.city:
            geo = await self.geocode(f"{dest.name} {dest.city}")
            if geo:
                dest.latitude, dest.longitude = geo["lat"], geo["lon"]
                if not dest.address and geo.get("address"):
                    dest.address = geo["address"]
                coords_resolved = True
                await asyncio.sleep(1.0)

        image_added = _has_real_image(dest.images)
        source = None
        if not image_added:
            image, desc = await self.resolve_image(dest.name, dest.city)
            if image:
                dest.images = [image]
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

    async def enrich_all_without_images(self, size: int = 20) -> list[dict]:
        if not self.repo:
            return []
        dests, _ = await self.repo.search(size=size)
        results = []
        for dest in dests:
            if dest.images:
                continue
            results.append({"name": dest.name, **(await self.enrich_destination(str(dest.id)))})
            await asyncio.sleep(1.0)
        return results
