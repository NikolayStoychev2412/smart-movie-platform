# app/models/favorite.py
from sqlalchemy import Column, Integer, ForeignKey, DateTime, func, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class Favorite(Base):
    __tablename__ = "favorites"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    movie_id = Column(Integer, ForeignKey("movies.id", ondelete="CASCADE"), index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Prevent duplicate favorites
    __table_args__ = (
        UniqueConstraint('user_id', 'movie_id', name='unique_user_movie_favorite'),
    )
    
    # Relationships
    user = relationship("User", back_populates="favorites")
    movie = relationship("Movie", back_populates="favorited_by")