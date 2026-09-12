"""ensure page view and audit tables exist

Revision ID: g7h8i9j0k1l2
Revises: f6a7b8c9d0e1
Create Date: 2026-09-12
"""

from typing import Sequence, Union

from alembic import op


revision: str = "g7h8i9j0k1l2"
down_revision: Union[str, None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Production previously stamped migrations after an error. These guards
    # repair databases where either write table was skipped without touching
    # existing data.
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS page_views (
            id UUID PRIMARY KEY,
            path VARCHAR(500) NOT NULL,
            user_id UUID NULL,
            ip VARCHAR(45) NULL,
            user_agent VARCHAR(500) NULL,
            created_at TIMESTAMP NOT NULL
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_page_views_path ON page_views (path)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_page_views_user_id ON page_views (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_page_views_created_at ON page_views (created_at)")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS audit_logs (
            id UUID PRIMARY KEY,
            actor_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
            action VARCHAR(50) NOT NULL,
            target_type VARCHAR(50) NULL,
            target_id VARCHAR(255) NULL,
            ip_address VARCHAR(45) NULL,
            user_agent VARCHAR(500) NULL,
            meta JSON NULL,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_audit_logs_action ON audit_logs (action)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_audit_logs_actor_id ON audit_logs (actor_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_audit_logs_created_at ON audit_logs (created_at)")


def downgrade() -> None:
    # These tables may have existed before this repair migration; do not drop
    # production data during rollback.
    pass
