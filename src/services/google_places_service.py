"""Google Places API integration for enriching destination data."""
import asyncio
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.repositories.destination_repo import DestinationRepository


class GooglePlacesService:
    """Enrich destinations with real photos, ratings, and reviews from Google Places API."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = DestinationRepository(db)

    async def enrich_destination(self, dest_id: str) -> dict[str, Any]:
        """Fetch place data from Google and update the destination."""
        dest = await self.repo.get_by_id(dest_id)
        if not dest:
            raise ValueError(f"Destination {dest_id} not found")

        api_key = getattr(settings, "google_places_api_key", None)
        if not api_key:
            return {"status": "no_api_key", "note": "Set GOOGLE_PLACES_API_KEY to enable"}

        import httpx

        url = "https://maps.googleapis.com/maps/api/place/findplacefromtext/json"
        params = {
            "input": f"{dest.name} {dest.city} {dest.country}",
            "inputtype": "textquery",
            "fields": "place_id,name,rating,photos,formatted_address,types,price_level,opening_hours,website,international_phone_number",
            "key": api_key,
        }

        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params)
            data = resp.json()
            if data.get("status") != "OK" or not data.get("candidates"):
                return {"status": "not_found", "query": f"{dest.name} {dest.city}"}

            place = data["candidates"][0]
            place_id = place.get("place_id")

            details_params = {
                "place_id": place_id,
                "fields": "rating,user_ratings_total,photos,reviews,opening_hours,website,price_level,editorial_summary",
                "key": api_key,
            }
            details_resp = await client.get(
                "https://maps.googleapis.com/maps/api/place/details/json",
                params=details_params,
            )
            details = details_resp.json().get("result", {})

        # Update destination with real data
        updated = False
        if details.get("rating"):
            dest.rating_avg = round(float(details["rating"]), 1)
            updated = True
        if details.get("user_ratings_total"):
            dest.review_count = int(details["user_ratings_total"])
            updated = True
        if details.get("photos"):
            photo_refs = details["photos"][:5]
            dest.images = [
                f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference={p['photo_reference']}&key={api_key}"
                for p in photo_refs
            ]
            updated = True
        if details.get("price_level") is not None:
            price_map = {0: "budget", 1: "budget", 2: "mid", 3: "luxury", 4: "luxury"}
            dest.price_level = price_map.get(details["price_level"], dest.price_level)
            updated = True
        if details.get("opening_hours"):
            dest.opening_hours = details["opening_hours"]
            updated = True

        if updated:
            await self.db.flush()

        return {
            "status": "enriched",
            "place_id": place_id,
            "rating": dest.rating_avg,
            "review_count": dest.review_count,
            "has_photos": len(dest.images or []) > 0,
        }

    async def enrich_all(self, batch_size: int = 5) -> list[dict]:
        """Enrich all destinations that don't have Google data."""
        results = []
        dests, _ = await self.repo.search(size=batch_size)
        for dest in dests:
            result = await self.enrich_destination(str(dest.id))
            results.append({"name": dest.name, **result})
            await asyncio.sleep(0.5)  # Rate limit: 2 req/s
        return results

    async def search_places(self, query: str, lat: float | None = None, lng: float | None = None) -> list[dict]:
        """Search Google Places for real POI data."""
        api_key = getattr(settings, "google_places_api_key", None)
        if not api_key:
            return [{"error": "No API key configured"}]

        import httpx

        params = {
            "query": query,
            "key": api_key,
        }
        if lat and lng:
            params["location"] = f"{lat},{lng}"
            params["radius"] = 50000

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://maps.googleapis.com/maps/api/place/textsearch/json",
                params=params,
            )
            data = resp.json()

        results = []
        for place in data.get("results", [])[:10]:
            results.append({
                "place_id": place.get("place_id"),
                "name": place.get("name"),
                "address": place.get("formatted_address"),
                "rating": place.get("rating"),
                "lat": place["geometry"]["location"]["lat"],
                "lng": place["geometry"]["location"]["lng"],
                "types": place.get("types", []),
                "photos": place.get("photos", []),
            })
        return results
