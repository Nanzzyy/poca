from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models.template import PageTemplate
from src.domain.section_types import SECTION_TYPES
from src.repositories.template_repo import TemplateRepository


def _payload(t: PageTemplate) -> dict:
    return {
        "id": t.id, "name": t.name, "description": t.description,
        "sections": t.sections, "is_default": t.is_default,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


class TemplateService:
    def __init__(self, db: AsyncSession):
        self.repo = TemplateRepository(db)

    async def list_all(self) -> list[dict]:
        return [_payload(t) for t in await self.repo.get_all()]

    async def get(self, template_id: str) -> dict:
        t = await self.repo.get_by_id(template_id)
        if not t:
            raise ValueError("Template not found")
        return _payload(t)

    async def create(self, *, id: str, name: str, description: str | None, sections: list, is_default: bool) -> PageTemplate:
        if await self.repo.get_by_id(id):
            raise FileExistsError("Template ID already exists")
        for s in sections:
            if s.type not in SECTION_TYPES:
                raise ValueError(f"Unknown section type: {s.type}")

        template = PageTemplate(
            id=id, name=name, description=description,
            sections=[s.model_dump() for s in sections], is_default=is_default,
        )
        self.repo.db.add(template)
        if is_default:
            await self.repo.unset_other_defaults()
        await self.repo.db.flush()
        return template

    async def update(
        self, template_id: str, *, name: str | None, description: str | None,
        sections: list | None, is_default: bool | None,
    ) -> None:
        t = await self.repo.get_by_id(template_id)
        if not t:
            raise ValueError("Template not found")

        if name is not None:
            t.name = name
        if description is not None:
            t.description = description
        if sections is not None:
            for s in sections:
                if s.type not in SECTION_TYPES:
                    raise ValueError(f"Unknown section type: {s.type}")
            t.sections = [s.model_dump() for s in sections]
        if is_default is not None:
            if is_default:
                await self.repo.unset_other_defaults()
            t.is_default = is_default

        await self.repo.db.flush()

    async def delete(self, template_id: str) -> None:
        t = await self.repo.get_by_id(template_id)
        if not t:
            raise ValueError("Template not found")
        await self.repo.delete(t)

    async def import_template(
        self, *, id: str, name: str, description: str | None, sections: list[dict], is_default: bool,
    ) -> tuple[PageTemplate, bool]:
        """Returns (template, created) — created=False means an existing
        template with this id was overwritten."""
        for s in sections:
            stype = s.get("type", "")
            if stype not in SECTION_TYPES:
                raise ValueError(f"Unknown section type: {stype}")

        existing = await self.repo.get_by_id(id)
        if existing:
            existing.name = name
            existing.description = description
            existing.sections = sections
            existing.is_default = is_default
            await self.repo.db.flush()
            return existing, False

        template = PageTemplate(id=id, name=name, description=description, sections=sections, is_default=is_default)
        self.repo.db.add(template)
        await self.repo.db.flush()
        return template, True

    async def export(self, template_id: str) -> dict:
        t = await self.repo.get_by_id(template_id)
        if not t:
            raise ValueError("Template not found")
        return {
            "id": t.id, "name": t.name, "description": t.description,
            "sections": t.sections, "is_default": t.is_default,
        }
