# app/models/watchlist.py
"""Watchlist model for tracking user's movie viewing status."""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.orm import relationship
from enum import Enum
from app.database import Base


class WatchStatus(str, Enum):
    """Movie watch status"""
    PLANNED = "planned"        # Want to watch (no taste signal)
    WATCHING = "watching"      # Currently watching (medium signal)
    COMPLETED = "completed"    # Finished watching (strong positive signal)
    DROPPED = "dropped"        # Started but quit (negative signal)


class Watchlist(Base):
    """
    User's watchlist with viewing status.
    Each user can have one status per movie.
    """
    __tablename__ = "watchlist"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    movie_id = Column(Integer, ForeignKey("movies.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(SQLEnum(WatchStatus), nullable=False, index=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    
    # Ensure one entry per user-movie combination
    __table_args__ = (
        UniqueConstraint('user_id', 'movie_id', name='unique_user_movie'),
    )
    
    # Relationships
    user = relationship("User", back_populates="watchlist")
    movie = relationship("Movie", back_populates="watchlist_entries")
    
    def __repr__(self):
        return f"<Watchlist(user_id={self.user_id}, movie_id={self.movie_id}, status={self.status})>"