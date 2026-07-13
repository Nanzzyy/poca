import math
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from src.repositories.destination_repo import DestinationRepository


def haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class TripPlannerService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.dest_repo = DestinationRepository(db)

    def optimize_route(self, activities: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Optimize activity order using greedy nearest-neighbor."""
        if len(activities) <= 1:
            return activities

        # Filter activities with coordinates
        with_coords = [a for a in activities if a.get("latitude") and a.get("longitude")]
        without_coords = [a for a in activities if not a.get("latitude") or not a.get("longitude")]

        if len(with_coords) <= 1:
            return activities

        # Greedy nearest-neighbor starting from first activity
        ordered = [with_coords[0]]
        remaining = with_coords[1:]

        while remaining:
            last = ordered[-1]
            nearest_idx = 0
            nearest_dist = float("inf")
            for i, act in enumerate(remaining):
                dist = haversine(
                    last["latitude"], last["longitude"],
                    act["latitude"], act["longitude"],
                )
                if dist < nearest_dist:
                    nearest_dist = dist
                    nearest_idx = i
            ordered.append(remaining.pop(nearest_idx))

        return ordered + without_coords

    async def estimate_travel_time(self, lat1: float, lng1: float, lat2: float, lng2: float) -> dict[str, Any]:
        dist_km = haversine(lat1, lng1, lat2, lng2)
        # Rough time estimates
        walking_min = (dist_km / 5) * 60  # 5 km/h
        driving_min = (dist_km / 40) * 60  # 40 km/h avg
        return {
            "distance_km": round(dist_km, 1),
            "walking_minutes": round(walking_min),
            "driving_minutes": round(driving_min),
            "public_transport_minutes": round(driving_min * 1.5),
        }
