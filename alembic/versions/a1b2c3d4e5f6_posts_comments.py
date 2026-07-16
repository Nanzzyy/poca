"""posts and comments

Revision ID: a1b2c3d4e5f6
Revises: 5d6acc1bfbc9
Create Date: 2026-07-13 11:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON, UUID

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "5d6acc1bfbc9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "posts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("destination_id", UUID(as_uuid=True), sa.ForeignKey("destinations.id"), nullable=True, index=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("media", JSON, server_default="[]"),
        sa.Column("like_count", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "comments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("post_id", UUID(as_uuid=True), sa.ForeignKey("posts.id"), nullable=False, index=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("comments")
    op.drop_table("posts")
