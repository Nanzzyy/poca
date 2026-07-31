import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from src.core.database import Base


class Follower(Base):
    """Follow edge: follower_id follows followee_id."""
    __tablename__ = "followers"
    __table_args__ = (
        UniqueConstraint("follower_id", "followee_id", name="uq_followers_pair"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    follower_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    followee_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    follower_user = relationship("User", foreign_keys=[follower_id], back_populates="following")
    followee_user = relationship("User", foreign_keys=[followee_id], back_populates="followers")
