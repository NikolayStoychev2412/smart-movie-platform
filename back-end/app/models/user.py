# app/models/user.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, func, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    preferred_genres = Column(JSON, default=list)
    # Relationships
    reviews = relationship("Review", back_populates="user", cascade="all, delete")
    watchlist = relationship("Watchlist", back_populates="user", cascade="all, delete")  # ✨ NEW