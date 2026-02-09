# app/models/movie.py
"""Movie model with quality flags."""

from sqlalchemy import Column, Integer, String, Float, Text, Boolean, Date, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Movie(Base):
    __tablename__ = "movies"
    
    id = Column(Integer, primary_key=True, index=True)

    tmdb_id = Column(Integer, unique=True, index=True)
    imdb_id = Column(String(20), index=True)

    title = Column(String(500), nullable=False, index=True)
    original_title = Column(String(500))
    tagline = Column(String(500))
    summary = Column(Text)

    title_bg = Column(String(500))
    tagline_bg = Column(String(500))
    summary_bg = Column(Text)

    genre = Column(String(500))
    genre_bg = Column(String(500))
    genres = Column(JSON)

    release_date = Column(Date)
    release_year = Column(Integer, index=True)
    runtime = Column(Integer)
    tmdb_rating = Column(Float, default=0)
    tmdb_vote_count = Column(Integer, default=0)
    popularity = Column(Float, default=0, index=True)

    average_rating = Column(Float, default=0)
    review_count = Column(Integer, default=0)

    poster_path = Column(String(200))
    poster_url = Column(String(500))
    backdrop_path = Column(String(200))
    backdrop_url = Column(String(500))

    cast = Column(JSON)
    crew = Column(JSON)
    main_actors = Column(JSON)
    director = Column(String(200))

    videos = Column(JSON)
    trailer_youtube_key = Column(String(50))

    status = Column(String(50))
    adult = Column(Boolean, default=False)
    original_language = Column(String(10))
    budget = Column(Integer, default=0)
    revenue = Column(Integer, default=0)
    homepage = Column(String(500))
    keywords = Column(JSON)

    production_companies = Column(JSON)
    production_countries = Column(JSON)
    spoken_languages = Column(JSON)
    belongs_to_collection = Column(JSON)

    embedding = Column(JSON)
    embedding_model = Column(String(100))
    embedding_generated_at = Column(Float)

    has_bg_translation = Column(Boolean, default=False, index=True)
    has_text_for_embedding = Column(Boolean, default=True, index=True)
    is_popular_seed = Column(Boolean, default=False, index=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    tmdb_last_updated = Column(Float)

    reviews = relationship("Review", back_populates="movie", cascade="all, delete-orphan")
    watchlist_entries = relationship("Watchlist", back_populates="movie", cascade="all, delete-orphan")
    favorited_by = relationship("Favorite", back_populates="movie", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Movie {self.id}: {self.title} ({self.release_year})>"
    
    @property
    def poster_url_full(self) -> str:
        """Get full poster URL"""
        if self.poster_path:
            return f"https://image.tmdb.org/t/p/w500{self.poster_path}"
        return self.poster_url or ""
    
    @property
    def backdrop_url_full(self) -> str:
        """Get full backdrop URL"""
        if self.backdrop_path:
            return f"https://image.tmdb.org/t/p/w1280{self.backdrop_path}"
        return self.backdrop_url or ""
    
    @property
    def display_rating(self) -> float:
        """
        Get best available rating for display.
        Uses community rating if enough reviews, else TMDb.
        """
        if self.review_count >= 3:
            return self.average_rating
        return self.tmdb_rating
    
    @property
    def embedding_text(self) -> str:
        """Get text for generating embeddings"""
        parts = []
        
        # Prefer English summary for embeddings (more consistent)
        if self.summary:
            parts.append(self.summary)
        elif self.summary_bg:
            parts.append(self.summary_bg)
        
        # Add genres
        if self.genre:
            parts.append(f"Genres: {self.genre}")
        
        # Add director
        if self.director:
            parts.append(f"Directed by {self.director}")
        
        return " ".join(parts)