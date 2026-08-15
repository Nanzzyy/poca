from __future__ import annotations

from datetime import datetime, timezone
import json

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models.knowledge import AIKnowledgeDocument, AIKnowledgeRevision


def _escape_like(q: str) -> str:
    return q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


class KnowledgeRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list(self, *, page=1, size=20, status=None, q=None, topic=None):
        stmt = select(AIKnowledgeDocument)
        if status:
            stmt = stmt.where(AIKnowledgeDocument.status == status)
        if topic:
            stmt = stmt.where(AIKnowledgeDocument.topic == topic)
        if q:
            needle = f"%{_escape_like(q)}%"
            stmt = stmt.where(or_(
                AIKnowledgeDocument.title.ilike(needle, escape="\\"),
                AIKnowledgeDocument.content.ilike(needle, escape="\\"),
            ))
        total = (await self.db.execute(select(func.count()).select_from(stmt.subquery()))).scalar() or 0
        rows = (await self.db.execute(stmt.order_by(AIKnowledgeDocument.updated_at.desc()).offset((page - 1) * size).limit(size))).scalars().all()
        return list(rows), total

    async def get(self, document_id: str):
        return await self.db.get(AIKnowledgeDocument, document_id)

    async def revisions(self, document_id: str):
        return list((await self.db.execute(select(AIKnowledgeRevision).where(AIKnowledgeRevision.document_id == document_id).order_by(AIKnowledgeRevision.version.desc()))).scalars().all())

    async def published(self):
        now = datetime.now(timezone.utc)
        stmt = select(AIKnowledgeDocument).where(
            AIKnowledgeDocument.status == "published",
            or_(AIKnowledgeDocument.effective_from.is_(None), AIKnowledgeDocument.effective_from <= now),
            or_(AIKnowledgeDocument.effective_until.is_(None), AIKnowledgeDocument.effective_until >= now),
            AIKnowledgeDocument.embedding.isnot(None),
        )
        return list((await self.db.execute(stmt)).scalars().all())

    @staticmethod
    def decode_embedding(value: str | None) -> list[float]:
        try:
            return json.loads(value) if value else []
        except (TypeError, json.JSONDecodeError):
            return []
