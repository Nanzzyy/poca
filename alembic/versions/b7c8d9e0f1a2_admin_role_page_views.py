"""admin role and page views

Revision ID: b7c8d9e0f1a2
Revises: a1b2c3d4e5f6
Create Date: 2026-07-31 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision: str = "b7c8d9e0f1a2"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE")
    op.create_table(
        "page_views",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("path", sa.String(length=500), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), nullable=True),
        sa.Column("ip", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        if_not_exists=True,
    )
    op.create_index("ix_page_views_path", "page_views", ["path"], if_not_exists=True)
    op.create_index("ix_page_views_user_id", "page_views", ["user_id"], if_not_exists=True)
    op.create_index("ix_page_views_created_at", "page_views", ["created_at"], if_not_exists=True)


def downgrade() -> None:
    op.drop_index("ix_page_views_created_at", table_name="page_views", if_exists=True)
    op.drop_index("ix_page_views_user_id", table_name="page_views", if_exists=True)
    op.drop_index("ix_page_views_path", table_name="page_views", if_exists=True)
    op.drop_table("page_views", if_exists=True)
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS is_active")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS role")
