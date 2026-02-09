# app/models/review.py
from sqlalchemy import Column, Integer, String, ForeignKey, Float, Text, DateTime, func,UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class Review(Base):
    __tablename__ = "reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    movie_id = Column(Integer, ForeignKey("movies.id", ondelete="CASCADE"), index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    rating = Column(Float, nullable=False, index=True)
    comment = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint('user_id', 'movie_id', name='unique_user_movie_review'),
    )
    
    # Relationships
    movie = relationship("Movie", back_populates="reviews")
    user = relationship("User", back_populates="reviews")