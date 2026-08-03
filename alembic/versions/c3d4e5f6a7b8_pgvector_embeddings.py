"""add embedding column to destinations

Revision ID: c3d4e5f6a7b8
Revises: b7c8d9e0f1a2
Create Date: 2026-08-03
"""

from alembic import op
import sqlalchemy as sa

revision = "c3d4e5f6a7b8"
down_revision = "b7c8d9e0f1a2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add embedding column (TEXT for JSON-encoded 384-dim vectors)
    # Embeddings are computed in Python via sentence-transformers
    # and stored as JSON arrays for cosine similarity search
    op.add_column(
        "destinations",
        sa.Column("embedding", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("destinations", "embedding")
