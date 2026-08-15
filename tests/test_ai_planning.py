from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from src.ai.local.intent_classifier import Intent, IntentClassifier
from src.services.ai_conversation_service import AIConversationService
from src.services.plan_service import PlanService


def _destination(number: int, level: str = "luxury"):
    return SimpleNamespace(
        id=number, name=f"Tempat {number}", city="Denpasar",
        latitude=None, longitude=None, price_level=level,
        images=["https://example.com/img.jpg"],
        category=SimpleNamespace(name="pantai"),
    )


@pytest.mark.asyncio
async def test_plan_respects_hard_budget_ceiling():
    service = PlanService(AsyncMock())
    service.dest_repo.get_categories = AsyncMock(return_value=[])
    service.dest_repo.search = AsyncMock(
        side_effect=[([_destination(i) for i in range(8)], 8), ([], 0)]
    )

    plan, _ = await service.build_plan(
        num_days=3, location="Bali", budget=2_000_000, people=2
    )

    assert plan["budget_requested"] == 2_000_000
    assert plan["budget_estimate"]["total"] <= 2_000_000
    assert plan["price_level"] == "budget"


@pytest.mark.asyncio
async def test_one_day_two_million_budget_does_not_select_luxury():
    service = PlanService(AsyncMock())
    service.dest_repo.get_categories = AsyncMock(return_value=[])
    service.dest_repo.search = AsyncMock(side_effect=[([], 0), ([], 0)])

    plan, _ = await service.build_plan(
        num_days=1, location="Bali", budget=2_000_000, people=1, kw="alam"
    )

    assert plan["price_level"] == "mid"
    assert plan["budget_estimate"]["total"] <= 2_000_000
    assert all(a["cost"] != 500_000 for d in plan["days"] for a in d["activities"])


def test_edit_intent_parses_days_and_budget_with_last_plan():
    result = IntentClassifier().classify(
        "ubah jadi 2 hari budget 1,5 juta",
        {"last_plan": {"num_days": 3, "budget_requested": 2_000_000}},
    )

    assert result.intent == Intent.PLAN_EDIT
    assert result.params["new_days"] == 2
    assert result.params["new_budget"] == 1_500_000


def test_edit_without_value_is_pending_and_value_is_parsed_next_turn():
    classifier = IntentClassifier()
    context = {"last_plan": {"num_days": 2, "budget_requested": 2_000_000}}

    request = classifier.classify("ubah budget", context)
    assert request.intent == Intent.PLAN_EDIT
    assert request.params == {"edit_field": "budget"}

    answer = classifier.classify("3 juta", {**context, "pending_edit": "budget"})
    assert answer.intent == Intent.PLAN_EDIT
    assert answer.params["new_budget"] == 3_000_000


def test_cancel_is_separate_intent():
    result = IntentClassifier().classify("batalkan rencana ini", {"last_plan": {"num_days": 2}})
    assert result.intent == Intent.PLAN_CANCEL


def test_edit_field_is_recognized_before_a_plan_exists():
    result = IntentClassifier().classify("ubah budget", {})
    assert result.intent == Intent.PLAN_EDIT
    assert result.params["edit_field"] == "budget"


@pytest.mark.asyncio
async def test_cached_plan_can_be_edited_and_is_persisted():
    db = AsyncMock()
    cache = AsyncMock()
    edited_plan = {
        "num_days": 2, "location": "Bali", "people": 2,
        "budget_requested": 2_000_000,
        "budget_estimate": {"total": 1_800_000},
        "budget_fit": "pas", "budget_delta": -200_000,
        "days": [{"day": 1, "activities": []}, {"day": 2, "activities": []}],
    }
    cache.get_plan.return_value = edited_plan
    repo = AsyncMock()
    repo.get_by_id.return_value = SimpleNamespace(
        messages=[], context_data={
            "state": "awaiting_plan_confirm",
            "last_plan": {**edited_plan, "num_days": 3},
        },
    )
    service = AIConversationService(db, cache=cache)
    service.conv_repo = repo

    _, metadata = await service.generate_response("conv-1", "ubah jadi 2 hari")

    assert metadata["plan"]["num_days"] == 2
    saved_context = repo.update_context.await_args_list[-1].args[1]
    assert saved_context["last_plan"]["num_days"] == 2
