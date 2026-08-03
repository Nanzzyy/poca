"""add global AI knowledge documents and revisions

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "e5f6a7b8c9d0"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ai_knowledge_documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("topic", sa.String(100), nullable=True),
        sa.Column("language", sa.String(20), nullable=False, server_default="id"),
        sa.Column("source_url", sa.String(1000), nullable=True),
        sa.Column("source_name", sa.String(255), nullable=True),
        sa.Column("trust_level", sa.String(20), nullable=False, server_default="official"),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("content_hash", sa.String(64), nullable=False),
        sa.Column("embedding", sa.Text(), nullable=True),
        sa.Column("metadata", postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default="{}"),
        sa.Column("effective_from", sa.DateTime(), nullable=True),
        sa.Column("effective_until", sa.DateTime(), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("published_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("published_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_ai_knowledge_status_topic", "ai_knowledge_documents", ["status", "topic"])
    op.create_index("ix_ai_knowledge_status_language", "ai_knowledge_documents", ["status", "language"])
    op.create_index("ix_ai_knowledge_documents_topic", "ai_knowledge_documents", ["topic"])
    op.create_index("ix_ai_knowledge_documents_status", "ai_knowledge_documents", ["status"])
    op.create_index("ix_ai_knowledge_documents_content_hash", "ai_knowledge_documents", ["content_hash"])

    op.create_table(
        "ai_knowledge_revisions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("document_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ai_knowledge_documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("content_hash", sa.String(64), nullable=False),
        sa.Column("changed_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_ai_knowledge_revision_document", "ai_knowledge_revisions", ["document_id", "version"])


def downgrade() -> None:
    op.drop_table("ai_knowledge_revisions")
    op.drop_index("ix_ai_knowledge_documents_content_hash", table_name="ai_knowledge_documents")
    op.drop_index("ix_ai_knowledge_documents_status", table_name="ai_knowledge_documents")
    op.drop_index("ix_ai_knowledge_documents_topic", table_name="ai_knowledge_documents")
    op.drop_index("ix_ai_knowledge_status_language", table_name="ai_knowledge_documents")
    op.drop_index("ix_ai_knowledge_status_topic", table_name="ai_knowledge_documents")
    op.drop_table("ai_knowledge_documents")
