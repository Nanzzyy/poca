import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from src.core.database import Base


class Trip(Base):
    __tablename__ = "trips"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    destination_id = Column(UUID(as_uuid=True), ForeignKey("destinations.id"), nullable=True)
    name = Column(String(255), nullable=False)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    status = Column(String(20), default="draft")  # draft, planned, active, completed
    total_budget = Column(Float, nullable=True)
    currency = Column(String(10), default="IDR")
    is_public = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="trips")
    days = relationship("TripDay", back_populates="trip", cascade="all, delete-orphan", order_by="TripDay.day_number")


class TripDay(Base):
    __tablename__ = "trip_days"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.id"), nullable=False)
    day_number = Column(Integer, nullable=False)
    date = Column(DateTime, nullable=True)
    notes = Column(String, nullable=True)

    trip = relationship("Trip", back_populates="days")
    activities = relationship("TripActivity", back_populates="trip_day", cascade="all, delete-orphan", order_by="TripActivity.order_index")


class TripActivity(Base):
    __tablename__ = "trip_activities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trip_day_id = Column(UUID(as_uuid=True), ForeignKey("trip_days.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(String, nullable=True)
    location_name = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    start_time = Column(String, nullable=True)
    end_time = Column(String, nullable=True)
    estimated_cost = Column(Float, nullable=True)
    currency = Column(String(10), default="IDR")
    category = Column(String(50), nullable=True)
    order_index = Column(Integer, default=0)

    trip_day = relationship("TripDay", back_populates="activities")
