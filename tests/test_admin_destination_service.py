"""Regression tests for the extracted DestinationService admin CRUD methods
(admin_create/admin_create_with_template/create_from_template/
create_from_place/admin_update/admin_soft_delete) — moved off raw
db.execute()/db.add() calls in admin.py."""
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

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
    def __init__(self, existing_slugs=None, dest=None):
        self.db = _FakeDB()
        self._existing_slugs = existing_slugs or set()
        self._dest = dest

    async def get_existing_slugs(self, slugs):
        return {s for s in self._existing_slugs if s in slugs}

    async def get_bare(self, dest_id):
        return self._dest


def _service(repo: _FakeDestinationRepo) -> DestinationService:
    service = DestinationService.__new__(DestinationService)
    service.repo = repo
    return service


def _create_body(**overrides):
    base = dict(
        name="Pantai Kuta", category_id=1, latitude=0.0, longitude=0.0,
        country="ID", city="Bali", address=None, description=None,
        images=[], tags=[], price_level=None, rating_avg=None, is_active=True,
        template_id=None,
    )
    base.update(overrides)
    return SimpleNamespace(**base)


@pytest.mark.asyncio
async def test_unique_slug_disambiguates_existing():
    repo = _FakeDestinationRepo(existing_slugs={"pantai-kuta"})
    service = _service(repo)

    slug = await service._unique_slug("Pantai Kuta")
    assert slug != "pantai-kuta"
    assert slug.startswith("pantai-kuta-")


@pytest.mark.asyncio
async def test_admin_create_writes_audit_log():
    repo = _FakeDestinationRepo()
    service = _service(repo)

    with patch("src.services.destination_service.log_audit", new=AsyncMock()) as mock_log:
        dest = await service.admin_create(_create_body(), actor_id="admin-1", ip_address="1.2.3.4", user_agent="pytest")

    assert dest.name == "Pantai Kuta"
    mock_log.assert_awaited_once()
    assert mock_log.call_args.kwargs["action"] == "destination_create"


@pytest.mark.asyncio
async def test_admin_create_with_template_applies_sections():
    repo = _FakeDestinationRepo()
    service = _service(repo)
    template = SimpleNamespace(sections=[{"type": "rich-text", "title": "Overview", "order": 0, "defaults": {}}])

    with patch("src.services.destination_service.log_audit", new=AsyncMock()):
        dest = await service.admin_create_with_template(
            _create_body(), template, actor_id="admin-1", ip_address=None, user_agent="",
        )

    sections = [a for a in repo.db.added if hasattr(a, "section_type")]
    assert len(sections) == 1
    assert sections[0].destination_id == dest.id


@pytest.mark.asyncio
async def test_create_from_template_requires_name():
    repo = _FakeDestinationRepo()
    service = _service(repo)
    template = SimpleNamespace(sections=[])

    body = SimpleNamespace(
        name="   ", category_id=None, latitude=0.0, longitude=0.0, country="ID", city="Bali",
        address=None, description=None, images=[], tags=[], price_level=None, section_overrides={},
    )
    with pytest.raises(ValueError, match="Name required"):
        await service.create_from_template(body, template)


@pytest.mark.asyncio
async def test_admin_update_missing_destination_raises():
    repo = _FakeDestinationRepo(dest=None)
    service = _service(repo)

    with pytest.raises(ValueError, match="Destination not found"):
        await service.admin_update("missing", {"name": "x"}, actor_id="admin-1", ip_address=None, user_agent="")


@pytest.mark.asyncio
async def test_admin_update_caps_images_at_three():
    dest = SimpleNamespace(id="d1", name="x")
    repo = _FakeDestinationRepo(dest=dest)
    service = _service(repo)

    with patch("src.services.destination_service.log_audit", new=AsyncMock()):
        await service.admin_update(
            "d1", {"images": ["a", "b", "c", "d", "e"]}, actor_id="admin-1", ip_address=None, user_agent="",
        )

    assert dest.images == ["a", "b", "c"]


@pytest.mark.asyncio
async def test_admin_soft_delete_sets_inactive_and_logs():
    dest = SimpleNamespace(id="d1", name="Pantai Kuta", is_active=True)
    repo = _FakeDestinationRepo(dest=dest)
    service = _service(repo)

    with patch("src.services.destination_service.log_audit", new=AsyncMock()) as mock_log:
        await service.admin_soft_delete("d1", actor_id="admin-1", ip_address=None, user_agent="")

    assert dest.is_active is False
    mock_log.assert_awaited_once()
    assert mock_log.call_args.kwargs["action"] == "destination_delete"


@pytest.mark.asyncio
async def test_admin_soft_delete_missing_destination_raises():
    repo = _FakeDestinationRepo(dest=None)
    service = _service(repo)

    with pytest.raises(ValueError, match="Destination not found"):
        await service.admin_soft_delete("missing", actor_id="admin-1", ip_address=None, user_agent="")
