from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models.destination import Category
from src.repositories.category_repo import CategoryRepository
from src.services.audit_service import log_audit


class CategoryService:
    def __init__(self, db: AsyncSession):
        self.repo = CategoryRepository(db)

    async def list_all(self) -> list[Category]:
        return await self.repo.get_all()

    async def create(
        self, *, name: str, slug: str | None, icon: str | None, parent_id: int | None,
        actor_id, ip_address: str | None, user_agent: str,
    ) -> Category:
        name = name.strip()
        slug = slug or name.lower().replace(" ", "-")
        cat = Category(name=name, slug=slug, icon=icon, parent_id=parent_id)
        cat = await self.repo.create(cat)
        await log_audit(
            action="category_create", actor_id=actor_id, target_type="category",
            target_id=str(cat.id), ip_address=ip_address, user_agent=user_agent, meta={"name": name},
        )
        return cat

    async def update(
        self, cat_id: int, fields: dict, *, actor_id, ip_address: str | None, user_agent: str,
    ) -> None:
        cat = await self.repo.get_by_id(cat_id)
        if not cat:
            raise ValueError("Category not found")
        for f in ("name", "slug", "icon"):
            if f in fields and fields[f] is not None:
                setattr(cat, f, fields[f])
        await self.repo.db.flush()
        await log_audit(
            action="category_update", actor_id=actor_id, target_type="category",
            target_id=str(cat.id), ip_address=ip_address, user_agent=user_agent,
        )

    async def delete(self, cat_id: int) -> None:
        cat = await self.repo.get_by_id(cat_id)
        if not cat:
            raise ValueError("Category not found")
        in_use = await self.repo.count_destinations_using(cat_id)
        if in_use:
            raise PermissionError(f"Cannot delete: {in_use} destinations use this category")
        await self.repo.delete(cat)
