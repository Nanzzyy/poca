import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import relationship

from src.core.database import Base


class Review(Base):
    __tablename__ = "reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    destination_id = Column(UUID(as_uuid=True), ForeignKey("destinations.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5
    title = Column(String(255), nullable=True)
    content = Column(Text, nullable=True)
    photos = Column(JSON, default=list)
    visit_date = Column(DateTime, nullable=True)
    actual_spending = Column(JSON, default=dict)
    is_verified = Column(Boolean, default=False)
    moderation_status = Column(String(20), default="pending")  # pending, approved, rejected
    helpful_count = Column(Integer, default=0)
    travel_tips = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="reviews")
    destination = relationship("Destination", back_populates="reviews")


class ReviewSummary(Base):
    __tablename__ = "review_summaries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    destination_id = Column(UUID(as_uuid=True), ForeignKey("destinations.id"), unique=True, nullable=False)
    summary_text = Column(Text, nullable=True)
    positive_topics = Column(JSON, default=list)
    negative_topics = Column(JSON, default=list)
    sentiment_score = Column(Float, nullable=True)
    generated_at = Column(DateTime, nullable=True)
    needs_regeneration = Column(Boolean, default=True)
    version = Column(Integer, default=1)

    destination = relationship("Destination", back_populates="review_summary")
