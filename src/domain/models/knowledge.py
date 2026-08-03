import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import relationship

from src.core.database import Base


class AIKnowledgeDocument(Base):
    __tablename__ = "ai_knowledge_documents"
    __table_args__ = (
        Index("ix_ai_knowledge_status_topic", "status", "topic"),
        Index("ix_ai_knowledge_status_language", "status", "language"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    topic = Column(String(100), nullable=True, index=True)
    language = Column(String(20), nullable=False, default="id")
    source_url = Column(String(1000), nullable=True)
    source_name = Column(String(255), nullable=True)
    trust_level = Column(String(20), nullable=False, default="official")
    status = Column(String(20), nullable=False, default="draft", index=True)
    version = Column(Integer, nullable=False, default=1)
    content_hash = Column(String(64), nullable=False, index=True)
    embedding = Column(Text, nullable=True)
    metadata_json = Column("metadata", JSON, nullable=False, default=dict)
    effective_from = Column(DateTime, nullable=True)
    effective_until = Column(DateTime, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    published_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    revisions = relationship("AIKnowledgeRevision", back_populates="document", cascade="all, delete-orphan", order_by="AIKnowledgeRevision.version")


class AIKnowledgeRevision(Base):
    __tablename__ = "ai_knowledge_revisions"
    __table_args__ = (Index("ix_ai_knowledge_revision_document", "document_id", "version"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("ai_knowledge_documents.id", ondelete="CASCADE"), nullable=False)
    version = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    content_hash = Column(String(64), nullable=False)
    changed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    document = relationship("AIKnowledgeDocument", back_populates="revisions")
