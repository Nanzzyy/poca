import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import relationship

from src.core.database import Base


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(String, nullable=True)
    icon = Column(String(50), nullable=True)
    xp_reward = Column(Integer, default=0)
    criteria = Column(JSON, default=dict)

    user_achievements = relationship("UserAchievement", back_populates="achievement")


class UserAchievement(Base):
    __tablename__ = "user_achievements"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    achievement_id = Column(Integer, ForeignKey("achievements.id"), primary_key=True)
    unlocked_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="achievements")
    achievement = relationship("Achievement", back_populates="user_achievements")


class Badge(Base):
    __tablename__ = "badges"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(String, nullable=True)
    icon = Column(String(50), nullable=True)
    criteria = Column(JSON, default=dict)


class UserBadge(Base):
    __tablename__ = "user_badges"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    badge_id = Column(Integer, ForeignKey("badges.id"), primary_key=True)
    earned_at = Column(DateTime, default=datetime.utcnow, nullable=False)
