from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models.asset import Asset


class AssetRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, asset: Asset) -> Asset:
        self.db.add(asset)
        await self.db.flush()
        return asset

    async def search(
        self, destination_id: str | None = None, section_id: str | None = None,
        page: int = 1, size: int = 50,
    ) -> tuple[list[Asset], int]:
        stmt = select(Asset)
        if destination_id:
            stmt = stmt.where(Asset.destination_id == destination_id)
        if section_id:
            stmt = stmt.where(Asset.section_id == section_id)

        total = (await self.db.execute(select(func.count()).select_from(stmt.subquery()))).scalar() or 0
        stmt = stmt.order_by(Asset.created_at.desc()).offset((page - 1) * size).limit(size)
        rows = (await self.db.execute(stmt)).scalars().all()
        return list(rows), total

    async def get_by_id(self, asset_id: str) -> Asset | None:
        return (await self.db.execute(select(Asset).where(Asset.id == asset_id))).scalar_one_or_none()

    async def get_by_ids(self, asset_ids: list[str]) -> list[Asset]:
        """Batch fetch — avoids an N+1 SELECT-per-id loop (e.g. bulk-tag)."""
        stmt = select(Asset).where(Asset.id.in_(asset_ids))
        return list((await self.db.execute(stmt)).scalars().all())

    async def delete(self, asset: Asset) -> None:
        await self.db.delete(asset)
        await self.db.flush()
