from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_db, require_user
from src.domain.models.trip import Trip, TripActivity, TripDay
from src.domain.models.user import User
from src.domain.schemas.trip import (
    TripActivityCreate,
    TripActivityResponse,
    TripCreate,
    TripDayCreate,
    TripDayResponse,
    TripResponse,
    TripUpdate,
)
from src.domain.schemas import BudgetEstimate
from src.repositories.trip_repo import TripRepository
from src.repositories.destination_repo import DestinationRepository
from src.services.budget_service import BudgetService
from src.services.trip_planner_service import TripPlannerService

router = APIRouter(prefix="/trips", tags=["trips"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_trip(
    body: TripCreate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> TripResponse:
    trip = Trip(
        user_id=user.id,
        destination_id=body.destination_id,
        name=body.name,
        start_date=body.start_date,
        end_date=body.end_date,
        currency=body.currency,
        is_public=body.is_public,
    )
    repo = TripRepository(db)
    trip = await repo.create(trip)
    return TripResponse.model_validate(trip)


@router.get("")
async def list_trips(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    repo = TripRepository(db)
    items, total = await repo.get_by_user(user.id, page, size)
    return {
        "items": [TripResponse.model_validate(t) for t in items],
        "total": total, "page": page, "size": size,
        "pages": (total + size - 1) // size,
    }


@router.get("/{trip_id}")
async def get_trip(
    trip_id: str,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> TripResponse:
    repo = TripRepository(db)
    trip = await repo.get_by_id(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if str(trip.user_id) != str(user.id) and not trip.is_public:
        raise HTTPException(status_code=403, detail="Not authorized")
    return TripResponse.model_validate(trip)


@router.put("/{trip_id}")
async def update_trip(
    trip_id: str,
    body: TripUpdate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> TripResponse:
    repo = TripRepository(db)
    trip = await repo.get_by_id(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if str(trip.user_id) != str(user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    if body.name is not None:
        trip.name = body.name
    if body.start_date is not None:
        trip.start_date = body.start_date
    if body.end_date is not None:
        trip.end_date = body.end_date
    if body.status is not None:
        trip.status = body.status
    if body.total_budget is not None:
        trip.total_budget = body.total_budget
    if body.is_public is not None:
        trip.is_public = body.is_public

    await repo.update(trip)
    return TripResponse.model_validate(trip)


@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trip(
    trip_id: str,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    repo = TripRepository(db)
    trip = await repo.get_by_id(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if str(trip.user_id) != str(user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
    await repo.delete(trip)


@router.post("/{trip_id}/days", status_code=status.HTTP_201_CREATED)
async def add_day(
    trip_id: str,
    body: TripDayCreate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> TripDayResponse:
    repo = TripRepository(db)
    trip = await repo.get_by_id(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if str(trip.user_id) != str(user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    day = TripDay(trip_id=trip_id, day_number=body.day_number, date=body.date, notes=body.notes)
    day = await repo.add_day(day)
    return TripDayResponse.model_validate(day)


@router.post("/{trip_id}/days/{day_num}/activities", status_code=status.HTTP_201_CREATED)
async def add_activity(
    trip_id: str,
    day_num: int,
    body: TripActivityCreate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> TripActivityResponse:
    repo = TripRepository(db)
    trip = await repo.get_by_id(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if str(trip.user_id) != str(user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    day = next((d for d in trip.days if d.day_number == day_num), None)
    if not day:
        raise HTTPException(status_code=404, detail="Day not found")

    activity = TripActivity(
        trip_day_id=day.id,
        name=body.name,
        description=body.description,
        location_name=body.location_name,
        latitude=body.latitude,
        longitude=body.longitude,
        start_time=body.start_time,
        end_time=body.end_time,
        estimated_cost=body.estimated_cost,
        currency=body.currency,
        category=body.category,
        order_index=body.order_index or 0,
    )
    activity = await repo.add_activity(activity)
    return TripActivityResponse.model_validate(activity)


@router.post("/{trip_id}/optimize-route")
async def optimize_route(
    trip_id: str,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> TripResponse:
    repo = TripRepository(db)
    trip = await repo.get_by_id(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if str(trip.user_id) != str(user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    planner = TripPlannerService(db)
    for day in trip.days:
        activities = [
            {
                "id": str(a.id),
                "latitude": a.latitude,
                "longitude": a.longitude,
                "order_index": a.order_index,
            }
            for a in day.activities
        ]
        optimized = planner.optimize_route(activities)
        for idx, act_data in enumerate(optimized):
            act = next((a for a in day.activities if str(a.id) == act_data["id"]), None)
            if act:
                act.order_index = idx + 1

    await repo.update(trip)
    return TripResponse.model_validate(trip)


@router.get("/{trip_id}/budget")
async def get_trip_budget(
    trip_id: str,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> BudgetEstimate:
    repo = TripRepository(db)
    trip = await repo.get_by_id(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if str(trip.user_id) != str(user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    if not trip.start_date or not trip.end_date:
        raise HTTPException(status_code=400, detail="Trip must have start and end dates")

    num_days = (trip.end_date - trip.start_date).days + 1
    price_level = "mid"
    if trip.destination_id:
        dest_repo = DestinationRepository(db)
        dest = await dest_repo.get_by_id(trip.destination_id)
        if dest:
            price_level = dest.price_level

    svc = BudgetService(db)
    budget = await svc.estimate_trip_budget(
        destination_id=str(trip.destination_id) if trip.destination_id else "",
        num_days=num_days,
        price_level=price_level,
    )
    return BudgetEstimate(**budget)
