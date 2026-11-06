from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models.template import PageTemplate


class TemplateRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self) -> list[PageTemplate]:
        stmt = select(PageTemplate).order_by(PageTemplate.id)
        return list((await self.db.execute(stmt)).scalars().all())

    async def get_by_id(self, template_id: str) -> PageTemplate | None:
        return await self.db.get(PageTemplate, template_id)

    async def create(self, template: PageTemplate) -> PageTemplate:
        self.db.add(template)
        await self.db.flush()
        return template

    async def delete(self, template: PageTemplate) -> None:
        await self.db.delete(template)
        await self.db.flush()

    async def unset_other_defaults(self) -> None:
        await self.db.execute(
            update(PageTemplate).where(PageTemplate.is_default == True).values(is_default=False)
        )
