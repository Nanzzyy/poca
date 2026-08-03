"""template sections and assets

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-08-03 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSON


revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "page_templates",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sections", JSON, nullable=False, server_default="[]"),
        sa.Column("is_default", sa.Boolean(), server_default="false"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        if_not_exists=True,
    )

    op.create_table(
        "destination_sections",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("destination_id", UUID(as_uuid=True), sa.ForeignKey("destinations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("section_type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(200), nullable=True),
        sa.Column("order", sa.Integer(), server_default="0"),
        sa.Column("visible", sa.Boolean(), server_default="true"),
        sa.Column("data", JSON, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        if_not_exists=True,
    )
    op.create_index("ix_destination_sections_destination_id", "destination_sections", ["destination_id"], if_not_exists=True)

    op.create_table(
        "assets",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("original_name", sa.String(255), nullable=False),
        sa.Column("mime_type", sa.String(100), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("path", sa.String(500), nullable=False),
        sa.Column("url", sa.String(500), nullable=False),
        sa.Column("destination_id", UUID(as_uuid=True), sa.ForeignKey("destinations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("section_id", UUID(as_uuid=True), sa.ForeignKey("destination_sections.id", ondelete="SET NULL"), nullable=True),
        sa.Column("alt_text", sa.String(300), nullable=True),
        sa.Column("tags", JSON, server_default="[]"),
        sa.Column("uploaded_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        if_not_exists=True,
    )
    op.create_index("ix_assets_destination_id", "assets", ["destination_id"], if_not_exists=True)


def downgrade() -> None:
    op.drop_index("ix_assets_destination_id", table_name="assets", if_exists=True)
    op.drop_table("assets", if_exists=True)
    op.drop_index("ix_destination_sections_destination_id", table_name="destination_sections", if_exists=True)
    op.drop_table("destination_sections", if_exists=True)
    op.drop_table("page_templates", if_exists=True)
