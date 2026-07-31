import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, String
from sqlalchemy.dialects.postgresql import UUID

from src.core.database import Base


class PageView(Base):
    """Lightweight traffic tracking — one row per page hit."""
    __tablename__ = "page_views"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    path = Column(String(500), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    ip = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
