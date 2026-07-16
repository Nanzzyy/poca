"""Build a multi-day trip plan from DB destinations + budget heuristics.

Used by the chat AI when the user asks for an itinerary ("buatkan plan liburan
2 hari di Bali budget 2 juta"). Returns a plain-dict plan that rides in the
chat message's `msg_metadata.plan` (no schema change) plus the list of
destinations used (for reco cards / grounding).

Reuses BudgetService (costs) and TripPlannerService (travel-time hints).
Does NOT persist — saving to a Trip is a separate user action via /trips.
"""
from __future__ import annotations

import math
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.locations import cities_for
from src.repositories.destination_repo import DestinationRepository
from src.services.budget_service import BudgetService
from src.services.trip_planner_service import TripPlannerService

TIME_SLOTS = ["09:00", "12:00", "15:00", "18:30"]  # morning / lunch / afternoon / dinner


def _budget_category(cat_name: str | None) -> str:
    """Map a destination category to a BudgetService activity-cost category."""
    c = (cat_name or "").lower()
    if c == "kuliner":
        return "food"
    if c == "hiburan":
        return "adventure"
    if c == "belanja":
        return "shopping"
    if c == "candi":
        return "museum"
    return "attraction"


def _level_from_budget(budget: float | None, num_days: int, people: int) -> str:
    if not budget or not num_days or not people:
        return "mid"
    per_day_person = budget / num_days / people
    if per_day_person < 400_000:
        return "budget"
    if per_day_person > 1_200_000:
        return "luxury"
    return "mid"


class PlanService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.dest_repo = DestinationRepository(db)
        self.budget = BudgetService(db)
        self.planner = TripPlannerService(db)

    async def build_plan(
        self, *, num_days: int, location: str | None, budget: float | None = None,
        people: int = 1, kw: str | None = None, excluded: list[str] | None = None,
    ) -> tuple[dict[str, Any], list]:
        num_days = max(1, min(int(num_days or 2), 7))
        people = max(1, int(people or 1))
        plan_level = _level_from_budget(budget, num_days, people)
        cities = cities_for(location)

        cats = {c.name.lower(): c.id for c in await self.dest_repo.get_categories()}
        kuliner_id = cats.get("kuliner")
        excl_ids = [cats[e] for e in (excluded or []) if e in cats]
        pos_cat = cats.get(kw) if kw else None

        # Attractions = everything except food, minus whatever the user excluded.
        attr_exclude = ([kuliner_id] if kuliner_id else []) + excl_ids
        attractions, _ = await self.dest_repo.search(
            cities=cities, category_id=pos_cat,
            exclude_category_ids=[i for i in attr_exclude if i is not None] or None,
            size=max(8, num_days * 3),
        )
        food, _ = await self.dest_repo.search(
            cities=cities, category_id=kuliner_id,
            exclude_category_ids=excl_ids or None,
            size=max(4, num_days * 2),
        )
        attractions = list(attractions)
        food = list(food)

        days: list[dict[str, Any]] = []
        activities_total = 0.0
        used: list = []
        seen_ids: set[str] = set()

        def take(pool: list):
            while pool:
                d = pool.pop(0)
                did = str(d.id)
                if did in seen_ids:
                    continue
                seen_ids.add(did)
                used.append(d)
                return d
            return None

        for d in range(1, num_days + 1):
            morning = take(attractions)
            lunch = take(food)
            afternoon = take(attractions)
            dinner = take(food)

            slots: list[tuple[Any, str]] = []  # (dest_or_None, time)
            if morning:
                slots.append((morning, "09:00"))
            if lunch:
                slots.append((lunch, "12:00"))
            if afternoon:
                slots.append((afternoon, "15:00"))
            if dinner:
                slots.append((dinner, "18:30"))

            activities: list[dict[str, Any]] = []
            for dest, t in slots:
                cat_label = dest.category.name if getattr(dest, "category", None) else None
                level = dest.price_level if dest.price_level in ("budget", "mid", "luxury") else plan_level
                cost_raw = await self.budget.estimate_activity_cost(_budget_category(cat_label), level)
                cost = round(cost_raw * people)
                activities_total += cost
                activities.append({
                    "name": dest.name,
                    "category": (cat_label or "wisata").lower(),
                    "time": t,
                    "location_name": dest.city or location or "Indonesia",
                    "lat": dest.latitude,
                    "lng": dest.longitude,
                    "cost": cost,
                    "destination_id": str(dest.id),
                    "price_level": level,
                })
            # generic meal placeholders if no food dests available
            if not lunch:
                activities.append(self._generic_meal("Makan siang (kuliner lokal)", "12:00", plan_level, people))
                activities_total += activities[-1]["cost"]
            if not dinner:
                activities.append(self._generic_meal("Makan malam (kuliner lokal)", "18:30", plan_level, people))
                activities_total += activities[-1]["cost"]

            # order by time, then attach travel-time hints between consecutive stops
            activities.sort(key=lambda a: a["time"])
            self._attach_travel_hints(activities)

            days.append({
                "day": d,
                "title": f"Hari {d}",
                "notes": f"{len([a for a in activities if a['category'] not in ('food',)])} destinasi + makan",
                "activities": activities,
            })

        # structural costs
        accommodation_rate = self.budget.ACCOMMODATION_COSTS[plan_level]
        rooms = max(1, math.ceil(people / 2))
        accommodation = accommodation_rate * num_days * rooms
        transport = 150_000 * num_days  # rough local transport (Gojek/sewa motor)
        total = activities_total + accommodation + transport

        fit, delta = self._budget_fit(total, budget)

        plan = {
            "title": f"Rencana Liburan {num_days} Hari di {location or 'Indonesia'}",
            "num_days": num_days,
            "location": location,
            "people": people,
            "budget_requested": budget,
            "budget_estimate": {
                "total": round(total),
                "per_day": round(total / num_days),
                "breakdown": {
                    "activities": round(activities_total),
                    "accommodation": round(accommodation),
                    "transport": round(transport),
                },
                "currency": "IDR",
            },
            "budget_fit": fit,
            "budget_delta": delta,
            "price_level": plan_level,
            "days": days,
        }
        return plan, used

    def _generic_meal(self, name: str, time_str: str, level: str, people: int) -> dict[str, Any]:
        cost = round(self.budget.FOOD_COSTS[level] * people)
        return {
            "name": name, "category": "food", "time": time_str,
            "location_name": None, "lat": None, "lng": None,
            "cost": cost, "destination_id": None, "price_level": level,
        }

    def _attach_travel_hints(self, activities: list[dict[str, Any]]) -> None:
        """Add travel_next {minutes, mode, distance_km} between consecutive geo-located stops."""
        from src.services.trip_planner_service import haversine  # local import keeps import graph simple
        geo = [a for a in activities if a.get("lat") and a.get("lng")]
        for a, b in zip(geo, geo[1:]):
            dist = haversine(a["lat"], a["lng"], b["lat"], b["lng"])
            minutes = max(5, round((dist / 40) * 60))  # ~40 km/h avg urban
            a["travel_next"] = {"minutes": minutes, "mode": "mobil", "distance_km": round(dist, 1)}

    @staticmethod
    def _budget_fit(total: float, requested: float | None) -> tuple[str, float | None]:
        if not requested:
            return "estimasi", None
        if total < requested * 0.9:
            fit = "hemat"
        elif total > requested * 1.1:
            fit = "over"
        else:
            fit = "pas"
        return fit, round(total - requested)
