# app/models/movie.py
from sqlalchemy import Column, Integer, String, Float, Text, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class Movie(Base):
    __tablename__ = "movies"
    
    # Existing fields
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    genre = Column(String, nullable=False, index=True)
    summary = Column(Text)
    poster_url = Column(String)
    average_rating = Column(Float, default=0.0, index=True)
    
    # AI fields
    embedding = Column(JSON, nullable=True)
    embedding_model = Column(String, default="all-MiniLM-L6-v2")
    embedding_generated_at = Column(Float, nullable=True)
    
    # Relationships
    reviews = relationship("Review", back_populates="movie", cascade="all, delete")
    watchlist_entries = relationship("Watchlist", back_populates="movie", cascade="all, delete")  # ✨ NEW
    
    @property
    def review_count(self) -> int:
        """Return the number of reviews for this movie"""
        if hasattr(self, 'reviews') and self.reviews is not None:
            try:
                return len(self.reviews)
            except:
                pass
        return 0