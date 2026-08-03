import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import relationship

from src.core.database import Base


class Asset(Base):
    __tablename__ = "assets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    mime_type = Column(String(100), nullable=False)
    size_bytes = Column(Integer, nullable=False)
    path = Column(String(500), nullable=False)
    url = Column(String(500), nullable=False)
    destination_id = Column(UUID(as_uuid=True), ForeignKey("destinations.id", ondelete="SET NULL"), nullable=True, index=True)
    section_id = Column(UUID(as_uuid=True), ForeignKey("destination_sections.id", ondelete="SET NULL"), nullable=True)
    alt_text = Column(String(300), nullable=True)
    tags = Column(JSON, default=list)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    destination = relationship("Destination", foreign_keys=[destination_id])
    section = relationship("DestinationSection", foreign_keys=[section_id])
    uploader = relationship("User", foreign_keys=[uploaded_by])
