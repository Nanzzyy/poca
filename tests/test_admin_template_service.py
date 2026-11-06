"""Regression tests for the extracted TemplateService — the section-type
validation, duplicate-id rejection, and default-unset-on-set-default
behavior that used to live inline in admin.py."""
from types import SimpleNamespace

import pytest

from src.services.template_service import TemplateService


class _FakeDB:
    def __init__(self):
        self.added = []
        self.flush_calls = 0

    def add(self, obj):
        self.added.append(obj)

    async def flush(self):
        self.flush_calls += 1


class _FakeTemplateRepo:
    def __init__(self, templates=None):
        self.db = _FakeDB()
        self.templates = templates or {}
        self.unset_defaults_calls = 0

    async def get_by_id(self, template_id):
        return self.templates.get(template_id)

    async def unset_other_defaults(self):
        self.unset_defaults_calls += 1


def _service(repo: _FakeTemplateRepo) -> TemplateService:
    service = TemplateService.__new__(TemplateService)
    service.repo = repo
    return service


def _section(type_: str):
    return SimpleNamespace(type=type_, model_dump=lambda: {"type": type_})


@pytest.mark.asyncio
async def test_create_rejects_unknown_section_type():
    repo = _FakeTemplateRepo()
    service = _service(repo)

    with pytest.raises(ValueError, match="Unknown section type"):
        await service.create(
            id="t1", name="Template", description=None,
            sections=[_section("not-a-real-type")], is_default=False,
        )


@pytest.mark.asyncio
async def test_create_rejects_duplicate_id():
    repo = _FakeTemplateRepo(templates={"t1": SimpleNamespace(id="t1")})
    service = _service(repo)

    with pytest.raises(FileExistsError):
        await service.create(id="t1", name="Template", description=None, sections=[], is_default=False)


@pytest.mark.asyncio
async def test_create_as_default_unsets_other_defaults():
    repo = _FakeTemplateRepo()
    service = _service(repo)

    await service.create(id="t1", name="Template", description=None, sections=[], is_default=True)

    assert repo.unset_defaults_calls == 1
    assert repo.db.added[0].is_default is True


@pytest.mark.asyncio
async def test_update_missing_template_raises_value_error():
    repo = _FakeTemplateRepo()
    service = _service(repo)

    with pytest.raises(ValueError, match="Template not found"):
        await service.update("missing", name="x", description=None, sections=None, is_default=None)


@pytest.mark.asyncio
async def test_update_rejects_unknown_section_type_without_touching_template():
    existing = SimpleNamespace(id="t1", name="old", sections=[], is_default=False)
    repo = _FakeTemplateRepo(templates={"t1": existing})
    service = _service(repo)

    with pytest.raises(ValueError, match="Unknown section type"):
        await service.update("t1", name=None, description=None, sections=[_section("bogus")], is_default=None)
    assert existing.sections == []
