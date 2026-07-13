from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.domain.models.trip import Trip, TripDay, TripActivity

class TripRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, trip_id: str) -> Trip | None:
        stmt = (
            select(Trip)
            .where(Trip.id == trip_id)
            .options(
                selectinload(Trip.days).selectinload(TripDay.activities)
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_user(self, user_id: str, page: int = 1, size: int = 20) -> tuple[list[Trip], int]:
        query = (
            select(Trip)
            .where(Trip.user_id == user_id)
            .options(selectinload(Trip.days).selectinload(TripDay.activities))
            .order_by(Trip.created_at.desc())
        )
        count_query = select(func.count()).select_from(query.subquery())
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0
        query = query.offset((page - 1) * size).limit(size)
        result = await self.db.execute(query)
        items = list(result.scalars().all())
        return items, total

    async def create(self, trip: Trip) -> Trip:
        self.db.add(trip)
        await self.db.flush()
        await self.db.refresh(trip)
        result = await self.get_by_id(trip.id)
        return result or trip

    async def update(self, trip: Trip) -> Trip:
        await self.db.merge(trip)
        return trip

    async def delete(self, trip: Trip) -> None:
        await self.db.delete(trip)

    async def add_day(self, day: TripDay) -> TripDay:
        self.db.add(day)
        await self.db.flush()
        return day

    async def add_activity(self, activity: TripActivity) -> TripActivity:
        self.db.add(activity)
        await self.db.flush()
        return activity

    async def get_activity(self, activity_id: str) -> TripActivity | None:
        stmt = select(TripActivity).where(TripActivity.id == activity_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def update_activity(self, activity: TripActivity) -> TripActivity:
        await self.db.merge(activity)
        return activity

    async def delete_activity(self, activity: TripActivity) -> None:
        await self.db.delete(activity)
