"""MED-07 — admin_bulk_import issued one slug-uniqueness SELECT per item
inside the import loop (up to 500 items/request). Verifies
DestinationService.bulk_import batches the check via get_existing_slugs,
and that it also fixes the latent same-batch duplicate-name collision."""
from types import SimpleNamespace

import pytest

from src.services.destination_service import DestinationService


class _FakeDB:
    def __init__(self):
        self.added = []
        self.flush_calls = 0

    def add(self, obj):
        self.added.append(obj)

    async def flush(self):
        self.flush_calls += 1


class _FakeDestinationRepo:
    def __init__(self, existing_slugs=None):
        self.db = _FakeDB()
        self._existing_slugs = existing_slugs or set()
        self.get_existing_slugs_calls: list[set[str]] = []

    async def get_existing_slugs(self, slugs):
        self.get_existing_slugs_calls.append(set(slugs))
        return {s for s in self._existing_slugs if s in slugs}


def _item(name, **kwargs):
    base = dict(
        category_id=None, latitude=0.0, longitude=0.0, country="ID", city="Bali",
        address=None, description=None, images=[], tags=[], price_level=None, rating_avg=None,
    )
    base.update(kwargs)
    return SimpleNamespace(name=name, **base)


@pytest.mark.asyncio
async def test_bulk_import_checks_slugs_in_a_single_batch():
    repo = _FakeDestinationRepo(existing_slugs={"pantai-kuta"})
    service = DestinationService.__new__(DestinationService)
    service.repo = repo

    items = [_item("Pantai Kuta"), _item("Candi Borobudur")]
    count, errors = await service.bulk_import(items, template=None)

    assert len(repo.get_existing_slugs_calls) == 1
    assert count == 2
    assert errors == []
    slugs = {d.slug for d in repo.db.added}
    assert "candi-borobudur" in slugs
    # "pantai-kuta" collided with an existing destination -> disambiguated
    assert "pantai-kuta" not in slugs
    assert any(s.startswith("pantai-kuta-") for s in slugs)


@pytest.mark.asyncio
async def test_bulk_import_disambiguates_duplicate_names_within_same_batch():
    repo = _FakeDestinationRepo(existing_slugs=set())
    service = DestinationService.__new__(DestinationService)
    service.repo = repo

    items = [_item("Pantai Kuta"), _item("Pantai Kuta")]
    count, errors = await service.bulk_import(items, template=None)

    assert count == 2
    slugs = [d.slug for d in repo.db.added]
    assert len(set(slugs)) == 2  # no collision between the two same-name items
