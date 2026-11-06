from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models.destination import Category, Destination


class CategoryRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self) -> list[Category]:
        stmt = select(Category).order_by(Category.id)
        return list((await self.db.execute(stmt)).scalars().all())

    async def get_by_id(self, cat_id: int) -> Category | None:
        return (await self.db.execute(select(Category).where(Category.id == cat_id))).scalar_one_or_none()

    async def create(self, category: Category) -> Category:
        self.db.add(category)
        await self.db.flush()
        return category

    async def delete(self, category: Category) -> None:
        await self.db.delete(category)
        await self.db.flush()

    async def count_destinations_using(self, cat_id: int) -> int:
        stmt = select(func.count()).select_from(Destination).where(Destination.category_id == cat_id)
        return (await self.db.execute(stmt)).scalar() or 0
