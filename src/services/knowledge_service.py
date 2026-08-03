from __future__ import annotations

import hashlib
import json
import math
import re
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.ai.local.embedder import get_embedder
from src.domain.models.knowledge import AIKnowledgeDocument, AIKnowledgeRevision
from src.repositories.knowledge_repo import KnowledgeRepository

MAX_CONTENT_LENGTH = 100_000
MIN_RELEVANCE = 0.28


def normalize_content(value: str) -> str:
    value = re.sub(r"\r\n?", "\n", value or "")
    value = re.sub(r"[ \t]+", " ", value)
    return re.sub(r"\n{3,}", "\n\n", value).strip()


def content_hash(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    return dot / (na * nb) if na and nb else 0.0


class KnowledgeService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = KnowledgeRepository(db)

    def validate_content(self, content: str) -> str:
        normalized = normalize_content(content)
        if not normalized:
            raise ValueError("Knowledge content is required")
        if len(normalized) > MAX_CONTENT_LENGTH:
            raise ValueError(f"Knowledge content exceeds {MAX_CONTENT_LENGTH} characters")
        return normalized

    def embed(self, content: str) -> str:
        """Return semantic embedding, with stdlib fallback for local/dev installs."""
        embedder = get_embedder()
        if embedder:
            vector = embedder.embed(content)
            if vector:
                return json.dumps(vector, separators=(",", ":"))

        # Keep publish/retrieval usable when optional sentence-transformers is absent.
        # Stable token hashing is lexical, not model training; it is only fallback.
        vector = [0.0] * 128
        for token in re.findall(r"[\w-]+", content.lower()):
            index = int(hashlib.sha256(token.encode()).hexdigest()[:8], 16) % len(vector)
            vector[index] += 1.0
        magnitude = math.sqrt(sum(value * value for value in vector))
        if not magnitude:
            raise ValueError("Knowledge content cannot be indexed")
        vector = [value / magnitude for value in vector]
        return json.dumps(vector, separators=(",", ":"))

    async def create_draft(self, *, title: str, content: str, actor_id, **fields) -> AIKnowledgeDocument:
        normalized = self.validate_content(content)
        doc = AIKnowledgeDocument(
            title=title.strip(), content=normalized, content_hash=content_hash(normalized),
            created_by=actor_id, status="draft", version=1, **fields,
        )
        self.db.add(doc)
        await self.db.flush()
        return doc

    async def update_draft(self, doc: AIKnowledgeDocument, *, title: str | None, content: str | None, actor_id, **fields):
        if doc.status == "archived":
            raise ValueError("Archived knowledge cannot be edited")
        if doc.status == "published":
            raise ValueError("Published knowledge requires a new revision")
        if title is not None:
            doc.title = title.strip()
        if content is not None:
            doc.content = self.validate_content(content)
            doc.content_hash = content_hash(doc.content)
        for key, value in fields.items():
            if value is not None:
                setattr(doc, key, value)
        doc.version += 1
        doc.embedding = None
        await self.db.flush()
        return doc

    async def publish(self, doc: AIKnowledgeDocument, actor_id) -> AIKnowledgeDocument:
        normalized = self.validate_content(doc.content)
        embedding = self.embed(normalized)
        if not embedding:
            raise ValueError("Embedding model unavailable; install sentence-transformers before publishing")
        doc.content = normalized
        doc.content_hash = content_hash(normalized)
        doc.embedding = embedding
        doc.status = "published"
        doc.published_by = actor_id
        doc.published_at = datetime.utcnow()
        revision = AIKnowledgeRevision(
            document_id=doc.id, version=doc.version, title=doc.title,
            content=doc.content, content_hash=doc.content_hash, changed_by=actor_id,
        )
        self.db.add(revision)
        await self.db.flush()
        return doc

    async def retrieve(self, query: str, *, topic: str | None = None, limit: int = 4) -> list[dict]:
        query_vector_json = self.embed(query)
        query_vector = self.repo.decode_embedding(query_vector_json)
        docs = await self.repo.published()
        scored = []
        for doc in docs:
            if topic and doc.topic and doc.topic != topic:
                continue
            score = cosine_similarity(query_vector, self.repo.decode_embedding(doc.embedding))
            if score >= MIN_RELEVANCE:
                scored.append((score, doc))
        scored.sort(key=lambda item: item[0], reverse=True)
        return [
            {
                "id": str(doc.id), "title": doc.title, "excerpt": doc.content[:800],
                "source": doc.source_name or doc.source_url or "Poca Knowledge Base",
                "source_url": doc.source_url, "version": doc.version, "score": round(score, 4),
            }
            for score, doc in scored[:limit]
        ]
