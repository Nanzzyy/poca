"""Unit tests for BudgetService cost estimation (ARCH-08)."""
from unittest.mock import AsyncMock

import pytest

from src.services.budget_service import BudgetService


@pytest.mark.asyncio
async def test_estimate_trip_budget_mid_level():
    svc = BudgetService(AsyncMock())
    result = await svc.estimate_trip_budget(
        destination_id="d-1", num_days=3, num_people=2, price_level="mid",
    )
    assert result["currency"] == "IDR"
    assert result["accommodation"] == 500000 * 3 * 2
    assert result["food"] == 250000 * 3 * 2
    assert result["tickets"] == 150000 * 3 * 2
    assert result["parking"] == 50000 * 3
    # emergency reserve = 15% of subtotal
    subtotal = result["accommodation"] + result["food"] + result["transportation"] + result["tickets"] + result["parking"]
    assert result["emergency_reserve"] == round(subtotal * 0.15, 0)
    assert result["total"] == round(subtotal * 1.15, 0)


@pytest.mark.asyncio
async def test_invalid_price_level_falls_back_to_mid():
    svc = BudgetService(AsyncMock())
    result = await svc.estimate_trip_budget("d-1", num_days=1, num_people=1, price_level="ultra")
    assert result["accommodation"] == 500000  # mid cost


@pytest.mark.asyncio
async def test_transport_scales_with_distance():
    svc = BudgetService(AsyncMock())
    result = await svc.estimate_trip_budget(
        "d-1", num_days=1, num_people=1, price_level="budget", round_trip_distance_km=100,
    )
    assert result["transportation"] == 3000 * 100


@pytest.mark.asyncio
async def test_estimate_activity_cost_known_category():
    svc = BudgetService(AsyncMock())
    assert await svc.estimate_activity_cost("adventure", "luxury") == 1000000
    assert await svc.estimate_activity_cost("museum", "budget") == 15000


@pytest.mark.asyncio
async def test_estimate_activity_cost_unknown_category_defaults():
    svc = BudgetService(AsyncMock())
    assert await svc.estimate_activity_cost("unknown-thing", "mid") == 100000


@pytest.mark.asyncio
async def test_zero_days_does_not_divide_by_zero():
    svc = BudgetService(AsyncMock())
    result = await svc.estimate_trip_budget("d-1", num_days=0, num_people=1)
    assert result["breakdown"]["per_day"] == 0
