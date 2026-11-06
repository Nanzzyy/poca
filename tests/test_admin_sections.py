"""MED-04/MED-05 — admin.py's destination-sections routes:
1. PUT .../sections/reorder was registered AFTER PUT .../sections/{section_id},
   so FastAPI's route matching captured "reorder" as a literal section_id and
   the reorder endpoint was unreachable (always 404). Fixed by re-registering
   reorder first.
2. admin_reorder_sections looped issuing one SELECT per item instead of a
   single WHERE id IN (...) — an N+1 query. Fixed via
   DestinationRepository.get_sections_by_ids + DestinationService.reorder_sections.
"""
import inspect
from types import SimpleNamespace

import pytest

from src.api.v1 import admin
from src.services.destination_service import DestinationService


def test_reorder_route_registered_before_section_id_route():
    source = inspect.getsource(admin)
    reorder_pos = source.index('@router.put("/destinations/{dest_id}/sections/reorder")')
    section_id_pos = source.index('@router.put("/destinations/{dest_id}/sections/{section_id}")')
    assert reorder_pos < section_id_pos


class _FakeDB:
    def __init__(self):
        self.flush_calls = 0

    async def flush(self):
        self.flush_calls += 1


class _FakeRepo:
    def __init__(self, sections):
        self.db = _FakeDB()
        self.sections = {s.id: s for s in sections}
        self.get_sections_by_ids_calls: list[list[str]] = []

    async def get_bare(self, dest_id):
        return SimpleNamespace(id=dest_id)

    async def get_sections_by_ids(self, dest_id, section_ids):
        self.get_sections_by_ids_calls.append(list(section_ids))
        return [s for sid, s in self.sections.items() if sid in section_ids]


@pytest.mark.asyncio
async def test_reorder_sections_fetches_in_a_single_batch():
    sections = [SimpleNamespace(id="a", order=0), SimpleNamespace(id="b", order=1), SimpleNamespace(id="c", order=2)]
    repo = _FakeRepo(sections)
    service = DestinationService.__new__(DestinationService)
    service.repo = repo

    items = [SimpleNamespace(id="a", order=2), SimpleNamespace(id="b", order=1), SimpleNamespace(id="c", order=0)]
    await service.reorder_sections("dest-1", items)

    assert len(repo.get_sections_by_ids_calls) == 1
    assert sorted(repo.get_sections_by_ids_calls[0]) == ["a", "b", "c"]
    assert sections[0].order == 2
    assert sections[2].order == 0
    assert repo.db.flush_calls == 1


@pytest.mark.asyncio
async def test_create_section_rejects_unknown_type():
    repo = _FakeRepo([])
    service = DestinationService.__new__(DestinationService)
    service.repo = repo

    with pytest.raises(ValueError, match="Unknown section type"):
        await service.create_section(
            "dest-1", section_type="not-a-real-type", title=None, order=0, visible=True, data={},
        )


@pytest.mark.asyncio
async def test_create_section_rejects_missing_destination():
    class _MissingDestRepo(_FakeRepo):
        async def get_bare(self, dest_id):
            return None

    repo = _MissingDestRepo([])
    service = DestinationService.__new__(DestinationService)
    service.repo = repo

    with pytest.raises(ValueError, match="Destination not found"):
        await service.create_section(
            "dest-1", section_type="hero-gallery", title=None, order=0, visible=True, data={},
        )
