import math
from datetime import date, timedelta
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from src.repositories.destination_repo import DestinationRepository


class BudgetService:
    # Average daily costs in IDR per price level
    ACCOMMODATION_COSTS = {"budget": 200000, "mid": 500000, "luxury": 2000000}
    FOOD_COSTS = {"budget": 100000, "mid": 250000, "luxury": 750000}
    TRANSPORT_PER_KM = {"budget": 3000, "mid": 7000, "luxury": 20000}
    TICKET_COSTS = {"budget": 50000, "mid": 150000, "luxury": 350000}

    def __init__(self, db: AsyncSession):
        self.db = db
        self.dest_repo = DestinationRepository(db)

    async def estimate_trip_budget(
        self,
        destination_id: str,
        num_days: int,
        num_people: int = 1,
        price_level: str = "mid",
        round_trip_distance_km: float | None = None,
    ) -> dict[str, Any]:
        level = price_level if price_level in self.ACCOMMODATION_COSTS else "mid"

        accommodation = self.ACCOMMODATION_COSTS[level] * num_days * num_people
        food = self.FOOD_COSTS[level] * num_days * num_people
        tickets = self.TICKET_COSTS[level] * num_days * num_people
        parking = 50000 * num_days if level != "budget" else 20000 * num_days

        transportation = 0.0
        if round_trip_distance_km:
            transportation = self.TRANSPORT_PER_KM[level] * round_trip_distance_km

        subtotal = accommodation + food + transportation + tickets + parking
        emergency_reserve = subtotal * 0.15  # 15% buffer

        total = subtotal + emergency_reserve

        return {
            "accommodation": round(accommodation, 0),
            "food": round(food, 0),
            "transportation": round(transportation, 0),
            "tickets": round(tickets, 0),
            "parking": round(parking, 0),
            "emergency_reserve": round(emergency_reserve, 0),
            "total": round(total, 0),
            "currency": "IDR",
            "breakdown": {
                "per_day": round(total / num_days, 0) if num_days else 0,
                "per_person": round(total / num_people, 0) if num_people else 0,
            },
        }

    async def estimate_activity_cost(self, category: str, price_level: str = "mid") -> float:
        costs = {
            "attraction": {"budget": 25000, "mid": 75000, "luxury": 250000},
            "museum": {"budget": 15000, "mid": 50000, "luxury": 150000},
            "adventure": {"budget": 150000, "mid": 350000, "luxury": 1000000},
            "food": {"budget": 50000, "mid": 150000, "luxury": 500000},
            "shopping": {"budget": 0, "mid": 0, "luxury": 0},
            "transport": {"budget": 10000, "mid": 50000, "luxury": 200000},
        }
        level = price_level if price_level in ("budget", "mid", "luxury") else "mid"
        return costs.get(category, {"budget": 50000, "mid": 100000, "luxury": 200000}).get(level, 100000)
