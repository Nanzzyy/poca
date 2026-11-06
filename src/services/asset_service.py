import os
import re
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models.asset import Asset
from src.repositories.asset_repo import AssetRepository


class AssetService:
    def __init__(self, db: AsyncSession):
        self.repo = AssetRepository(db)

    async def upload(
        self, *, content: bytes, original_filename: str | None, content_type: str,
        upload_dir: str, base_url: str,
        destination_id: str | None, section_id: str | None,
        alt_text: str, tags: list[str], uploaded_by: uuid.UUID,
    ) -> Asset:
        # destination_id must be a valid UUID to prevent path traversal via
        # the subdirectory component.
        subdir = "general"
        if destination_id:
            try:
                subdir = str(uuid.UUID(destination_id))
            except ValueError:
                raise ValueError("Invalid destination_id")

        ext = os.path.splitext(original_filename or "file")[1] or ".bin"
        ext = os.path.basename(ext)
        if not re.fullmatch(r"\.[a-zA-Z0-9]{1,10}", ext):
            ext = ".bin"
        asset_uuid = uuid.uuid4()
        filename = f"{asset_uuid.hex}{ext}"

        dest_dir = os.path.join(upload_dir, subdir)
        os.makedirs(dest_dir, exist_ok=True)
        with open(os.path.join(dest_dir, filename), "wb") as f:
            f.write(content)

        relative_path = f"uploads/assets/{subdir}/{filename}"
        url = f"{base_url}/{relative_path}"

        asset = Asset(
            id=asset_uuid,
            filename=filename,
            original_name=original_filename or "upload",
            mime_type=content_type,
            size_bytes=len(content),
            path=relative_path,
            url=url,
            destination_id=destination_id,
            section_id=section_id,
            alt_text=alt_text or None,
            tags=tags,
            uploaded_by=uploaded_by,
        )
        return await self.repo.create(asset)

    async def list_assets(
        self, *, destination_id: str | None, section_id: str | None, tag: str | None,
        page: int, size: int,
    ) -> dict:
        rows, total = await self.repo.search(destination_id, section_id, page, size)
        items = []
        for a in rows:
            if tag and tag not in (a.tags or []):
                continue
            items.append({
                "id": str(a.id), "filename": a.filename, "original_name": a.original_name,
                "url": a.url, "mime_type": a.mime_type, "size_bytes": a.size_bytes,
                "destination_id": str(a.destination_id) if a.destination_id else None,
                "section_id": str(a.section_id) if a.section_id else None,
                "alt_text": a.alt_text, "tags": a.tags or [],
                "uploaded_by": str(a.uploaded_by) if a.uploaded_by else None,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            })
        return {"items": items, "total": total, "page": page, "size": size}

    async def update_asset(
        self, asset_id: str, *, alt_text: str | None, tags: list[str] | None,
        destination_id: str | None, section_id: str | None,
    ) -> Asset:
        asset = await self.repo.get_by_id(asset_id)
        if not asset:
            raise ValueError("Asset not found")
        if alt_text is not None:
            asset.alt_text = alt_text
        if tags is not None:
            asset.tags = tags
        if destination_id is not None:
            asset.destination_id = destination_id
        if section_id is not None:
            asset.section_id = section_id
        await self.repo.db.flush()
        return asset

    async def delete_asset(self, asset_id: str, *, upload_dir: str) -> None:
        asset = await self.repo.get_by_id(asset_id)
        if not asset:
            raise ValueError("Asset not found")

        full_path = os.path.join(os.path.dirname(upload_dir), "..", asset.path)
        try:
            if os.path.isfile(full_path):
                os.remove(full_path)
        except OSError:
            pass

        await self.repo.delete(asset)

    async def bulk_tag(self, asset_ids: list[str], *, mode: str, tags: list[str]) -> int:
        assets = await self.repo.get_by_ids(asset_ids)
        for asset in assets:
            if mode == "replace":
                asset.tags = tags
            else:
                existing = set(asset.tags or [])
                existing.update(tags)
                asset.tags = list(existing)
        await self.repo.db.flush()
        return len(assets)
