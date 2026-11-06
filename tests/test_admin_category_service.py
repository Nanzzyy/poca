"""Regression tests for the extracted CategoryService — in particular the
delete-blocked-while-in-use guard that used to be inline in admin.py."""
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from src.services.category_service import CategoryService


class _FakeDB:
    def __init__(self):
        self.flush_calls = 0

    async def flush(self):
        self.flush_calls += 1


class _FakeCategoryRepo:
    def __init__(self, category=None, destinations_using=0):
        self.db = _FakeDB()
        self._category = category
        self._destinations_using = destinations_using
        self.deleted = []

    async def get_by_id(self, cat_id):
        return self._category

    async def count_destinations_using(self, cat_id):
        return self._destinations_using

    async def delete(self, category):
        self.deleted.append(category)


def _service(repo: _FakeCategoryRepo) -> CategoryService:
    service = CategoryService.__new__(CategoryService)
    service.repo = repo
    return service


@pytest.mark.asyncio
async def test_delete_blocked_when_category_in_use():
    category = SimpleNamespace(id=1, name="Pantai")
    repo = _FakeCategoryRepo(category=category, destinations_using=5)
    service = _service(repo)

    with pytest.raises(PermissionError, match="5 destinations"):
        await service.delete(1)
    assert repo.deleted == []


@pytest.mark.asyncio
async def test_delete_succeeds_when_unused():
    category = SimpleNamespace(id=1, name="Pantai")
    repo = _FakeCategoryRepo(category=category, destinations_using=0)
    service = _service(repo)

    await service.delete(1)
    assert repo.deleted == [category]


@pytest.mark.asyncio
async def test_delete_missing_category_raises_value_error():
    repo = _FakeCategoryRepo(category=None)
    service = _service(repo)

    with pytest.raises(ValueError, match="Category not found"):
        await service.delete(999)


@pytest.mark.asyncio
async def test_update_missing_category_raises_value_error():
    repo = _FakeCategoryRepo(category=None)
    service = _service(repo)

    with patch("src.services.category_service.log_audit", new=AsyncMock()):
        with pytest.raises(ValueError, match="Category not found"):
            await service.update(999, {"name": "x"}, actor_id="admin-1", ip_address=None, user_agent="")
