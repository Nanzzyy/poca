"""Regression test for the gamification layering fix.

Before: gamification.py called GamificationRepository directly for
/achievements and /users/me/achievements, bypassing GamificationService,
while GamificationService itself never used GamificationRepository for
check_achievements — it re-queried Achievement directly, duplicating the
repo's get_all(). Both endpoints and check_achievements now go through
GamificationService -> GamificationRepository."""
import inspect
from types import SimpleNamespace

import pytest

from src.api.v1 import gamification
from src.services.gamification_service import GamificationService


def test_router_does_not_import_repository_directly():
    source = inspect.getsource(gamification)
    assert "GamificationRepository" not in source
    assert "GamificationService(db)" in source


class _FakeRepo:
    def __init__(self, achievements):
        self._achievements = achievements
        self.get_all_calls = 0

    async def get_all(self):
        self.get_all_calls += 1
        return self._achievements

    async def get_user_achievements(self, user_id):
        return []


@pytest.mark.asyncio
async def test_service_delegates_achievements_to_repo():
    repo = _FakeRepo(achievements=[SimpleNamespace(id=1, code="first_review")])
    service = GamificationService.__new__(GamificationService)
    service.repo = repo
    service.db = None

    result = await service.get_achievements()

    assert result == repo._achievements
    assert repo.get_all_calls == 1


@pytest.mark.asyncio
async def test_check_achievements_uses_repo_not_raw_query():
    repo = _FakeRepo(achievements=[])
    service = GamificationService.__new__(GamificationService)
    service.repo = repo
    service.db = _NoOpDB()

    await service.check_achievements("user-1")

    assert repo.get_all_calls == 1


class _NoOpDB:
    async def execute(self, *args, **kwargs):
        class _Result:
            def scalars(self):
                class _S:
                    def all(self):
                        return []
                return _S()

            def scalar(self):
                return 0

            def __iter__(self):
                return iter([])

        return _Result()
