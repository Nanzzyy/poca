"""Regression tests for the extracted AnalyticsService — dashboard
aggregation and audit-log filter validation that used to live inline in
admin.py."""
import uuid
from datetime import datetime, timezone

import pytest

from src.services.analytics_service import AnalyticsService


class _FakeAnalyticsRepo:
    def __init__(self):
        self.search_audit_logs_calls = []

    async def count_active_users(self):
        return 10

    async def count_active_destinations(self):
        return 20

    async def count_posts(self):
        return 30

    async def count_pageviews_since(self, since):
        return 5

    async def count_new_users_since(self, since):
        return 2

    async def weekly_pageviews(self, since):
        return [("2026-11-01", 3), ("2026-11-02", 4)]

    async def top_pages_since(self, since, limit=5):
        return [("/home", 7)]

    async def search_audit_logs(self, **kwargs):
        self.search_audit_logs_calls.append(kwargs)
        return [], 0


def _service(repo: _FakeAnalyticsRepo) -> AnalyticsService:
    service = AnalyticsService.__new__(AnalyticsService)
    service.repo = repo
    return service


@pytest.mark.asyncio
async def test_dashboard_assembles_all_metrics():
    repo = _FakeAnalyticsRepo()
    service = _service(repo)

    result = await service.dashboard()

    assert result["total_users"] == 10
    assert result["total_destinations"] == 20
    assert result["total_posts"] == 30
    assert result["weekly_views"] == [{"date": "2026-11-01", "count": 3}, {"date": "2026-11-02", "count": 4}]
    assert result["top_pages"] == [{"path": "/home", "count": 7}]


@pytest.mark.asyncio
async def test_audit_logs_rejects_invalid_actor_id():
    repo = _FakeAnalyticsRepo()
    service = _service(repo)

    with pytest.raises(ValueError, match="Invalid actor_id"):
        await service.audit_logs(page=1, size=50, action="", actor_id="not-a-uuid", date_from="", date_to="")


@pytest.mark.asyncio
async def test_audit_logs_rejects_invalid_date():
    repo = _FakeAnalyticsRepo()
    service = _service(repo)

    with pytest.raises(ValueError, match="Invalid date_from"):
        await service.audit_logs(page=1, size=50, action="", actor_id="", date_from="not-a-date", date_to="")


@pytest.mark.asyncio
async def test_audit_logs_parses_valid_filters():
    repo = _FakeAnalyticsRepo()
    service = _service(repo)
    actor_id = str(uuid.uuid4())

    await service.audit_logs(
        page=1, size=50, action="login_success", actor_id=actor_id,
        date_from="2026-11-01T00:00:00", date_to="2026-11-02T00:00:00",
    )

    call = repo.search_audit_logs_calls[0]
    assert call["action"] == "login_success"
    assert call["actor_id"] == uuid.UUID(actor_id)
    assert call["date_from"] == datetime(2026, 11, 1, tzinfo=timezone.utc)
