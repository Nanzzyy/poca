from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field, HttpUrl


class KnowledgeCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1, max_length=100_000)
    topic: str | None = Field(None, max_length=100)
    language: str = Field("id", max_length=20)
    source_url: HttpUrl | None = None
    source_name: str | None = Field(None, max_length=255)
    trust_level: str = Field("official", pattern="^(official|verified|community)$")
    effective_from: datetime | None = None
    effective_until: datetime | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class KnowledgeUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    content: str | None = Field(None, min_length=1, max_length=100_000)
    topic: str | None = Field(None, max_length=100)
    language: str | None = Field(None, max_length=20)
    source_url: HttpUrl | None = None
    source_name: str | None = Field(None, max_length=255)
    trust_level: str | None = Field(None, pattern="^(official|verified|community)$")
    effective_from: datetime | None = None
    effective_until: datetime | None = None
    metadata: dict[str, Any] | None = None


def knowledge_item(doc) -> dict:
    return {
        "id": str(doc.id), "title": doc.title, "content": doc.content,
        "topic": doc.topic, "language": doc.language, "source_url": doc.source_url,
        "source_name": doc.source_name, "trust_level": doc.trust_level,
        "status": doc.status, "version": doc.version, "content_hash": doc.content_hash,
        "effective_from": doc.effective_from.isoformat() if doc.effective_from else None,
        "effective_until": doc.effective_until.isoformat() if doc.effective_until else None,
        "published_at": doc.published_at.isoformat() if doc.published_at else None,
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
        "updated_at": doc.updated_at.isoformat() if doc.updated_at else None,
    }
