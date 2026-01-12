# app/models/movie.py
from sqlalchemy import Column, Integer, String, Float, Text, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class Movie(Base):
    __tablename__ = "movies"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # English fields
    title = Column(String, nullable=False, index=True)
    genre = Column(String, nullable=False, index=True)
    summary = Column(Text)
    
    # Bulgarian fields
    title_bg = Column(String, nullable=True)
    genre_bg = Column(String, nullable=True)
    summary_bg = Column(Text, nullable=True)
    
    # Common fields
    poster_url = Column(String)
    average_rating = Column(Float, default=0.0, index=True)
    
    # AI fields
    embedding = Column(JSON, nullable=True)
    embedding_model = Column(String, default="paraphrase-multilingual-MiniLM-L12-v2")
    embedding_generated_at = Column(Float, nullable=True)
    
    # Relationships
    reviews = relationship("Review", back_populates="movie", cascade="all, delete")
    watchlist_entries = relationship("Watchlist", back_populates="movie", cascade="all, delete")
    
    @property
    def review_count(self) -> int:
        if hasattr(self, 'reviews') and self.reviews is not None:
            try:
                return len(self.reviews)
            except:
                pass
        return 0