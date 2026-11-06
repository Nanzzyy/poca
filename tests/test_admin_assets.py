"""MED-06 — admin_bulk_tag_assets looped issuing one SELECT per asset_id
instead of a single WHERE id IN (...). Verifies AssetService.bulk_tag uses
AssetRepository.get_by_ids as a single batch fetch."""
from types import SimpleNamespace

import pytest

from src.services.asset_service import AssetService


class _FakeDB:
    def __init__(self):
        self.flush_calls = 0

    async def flush(self):
        self.flush_calls += 1


class _FakeAssetRepo:
    def __init__(self, assets):
        self.db = _FakeDB()
        self.assets = {a.id: a for a in assets}
        self.get_by_ids_calls: list[list[str]] = []

    async def get_by_ids(self, asset_ids):
        self.get_by_ids_calls.append(list(asset_ids))
        return [a for aid, a in self.assets.items() if aid in asset_ids]


@pytest.mark.asyncio
async def test_bulk_tag_fetches_assets_in_a_single_batch():
    assets = [
        SimpleNamespace(id="a", tags=["x"]),
        SimpleNamespace(id="b", tags=[]),
        SimpleNamespace(id="c", tags=["y"]),
    ]
    repo = _FakeAssetRepo(assets)
    service = AssetService.__new__(AssetService)
    service.repo = repo

    updated = await service.bulk_tag(["a", "b", "c"], mode="add", tags=["new"])

    assert len(repo.get_by_ids_calls) == 1
    assert sorted(repo.get_by_ids_calls[0]) == ["a", "b", "c"]
    assert updated == 3
    assert set(assets[0].tags) == {"x", "new"}
    assert set(assets[1].tags) == {"new"}
    assert repo.db.flush_calls == 1


@pytest.mark.asyncio
async def test_bulk_tag_replace_mode_overwrites_tags():
    assets = [SimpleNamespace(id="a", tags=["old"])]
    repo = _FakeAssetRepo(assets)
    service = AssetService.__new__(AssetService)
    service.repo = repo

    await service.bulk_tag(["a"], mode="replace", tags=["new"])

    assert assets[0].tags == ["new"]
