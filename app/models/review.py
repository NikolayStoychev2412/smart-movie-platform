# app/models/review.py
from sqlalchemy import Column, Integer, String, ForeignKey, Float, Text, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base

class Review(Base):
    __tablename__ = "reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    movie_id = Column(Integer, ForeignKey("movies.id", ondelete="CASCADE"), index=True)  # ✅ Added index
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)  # ✅ Added index
    rating = Column(Float, nullable=False, index=True)  # ✅ Added index
    comment = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    movie = relationship("Movie", back_populates="reviews")
    user = relationship("User", back_populates="reviews")