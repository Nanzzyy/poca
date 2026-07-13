import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import relationship

from src.core.database import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    icon = Column(String(50), nullable=True)
    slug = Column(String(100), unique=True, nullable=False)
    parent_id = Column(Integer, ForeignKey("categories.id"), nullable=True)

    children = relationship("Category", backref="parent", remote_side=[id], lazy="selectin")
    destinations = relationship("Destination", back_populates="category")


class Destination(Base):
    __tablename__ = "destinations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    country = Column(String(100), nullable=False)
    city = Column(String(100), nullable=True)
    address = Column(String(500), nullable=True)
    images = Column(JSON, default=list)
    tags = Column(JSON, default=list)
    price_level = Column(String(20), default="mid")  # budget, mid, luxury
    rating_avg = Column(Float, default=0.0)
    review_count = Column(Integer, default=0)
    opening_hours = Column(JSON, default=dict)
    best_visiting_hours = Column(JSON, default=dict)
    local_tips = Column(JSON, default=dict)  # food, customs, hidden_gems
    seasonal_info = Column(JSON, default=dict)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    category = relationship("Category", back_populates="destinations", lazy="selectin")
    reviews = relationship("Review", back_populates="destination", cascade="all, delete-orphan")
    review_summary = relationship("ReviewSummary", back_populates="destination", uselist=False, cascade="all, delete-orphan")
