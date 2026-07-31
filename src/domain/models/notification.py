import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import relationship

from src.core.database import Base


class Notification(Base):
    """Cross-feature notification: like/comment/follow/achievement/trip.

    actor_id = who did the thing; user_id = who receives the notification.
    meta JSON carries feature-specific extras (post_id, destination_id, trip_id).
    """
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    type = Column(String(30), nullable=False)  # like | comment | follow | achievement | trip
    title = Column(String(255), nullable=False)
    subtitle = Column(String(500), nullable=True)
    meta = Column(JSON, default=dict)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", foreign_keys=[user_id], back_populates="notifications")
    actor = relationship("User", foreign_keys=[actor_id])
