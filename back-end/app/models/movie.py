# app/models/movie.py
"""
Enhanced Movie model with full TMDb support:
- Cast & Crew
- Videos (trailers, teasers)
- Release dates
- Production details
- Multiple images (posters, backdrops)
"""
from sqlalchemy import Column, Integer, String, Float, Text, JSON, Date, Boolean
from sqlalchemy.orm import relationship
from app.database import Base
from typing import List, Dict, Optional


class Movie(Base):
    __tablename__ = "movies"
    
    # =========================================================================
    # PRIMARY KEY
    # =========================================================================
    id = Column(Integer, primary_key=True, index=True)
    
    # =========================================================================
    # CORE FIELDS (English)
    # =========================================================================
    title = Column(String, nullable=False, index=True)
    genre = Column(String, nullable=False, index=True)
    summary = Column(Text)  # overview from TMDb
    tagline = Column(String, nullable=True)  # Short catchy tagline
    
    # =========================================================================
    # BULGARIAN TRANSLATIONS
    # =========================================================================
    title_bg = Column(String, nullable=True)
    genre_bg = Column(String, nullable=True)
    summary_bg = Column(Text, nullable=True)
    tagline_bg = Column(String, nullable=True)
    
    # =========================================================================
    # TMDB IDENTIFIERS
    # =========================================================================
    tmdb_id = Column(Integer, unique=True, index=True, nullable=True)
    imdb_id = Column(String, unique=True, index=True, nullable=True)
    
    # =========================================================================
    # IMAGES
    # =========================================================================
    poster_url = Column(String)  # Main poster (w500)
    poster_path = Column(String)  # TMDb path (for different sizes)
    backdrop_url = Column(String)  # Wide background image
    backdrop_path = Column(String)  # TMDb path
    
    # =========================================================================
    # RATINGS & POPULARITY
    # =========================================================================
    average_rating = Column(Float, default=0.0, index=True)  # Our platform rating
    tmdb_rating = Column(Float, nullable=True)  # TMDb vote_average
    tmdb_vote_count = Column(Integer, nullable=True)  # Number of TMDb votes
    popularity = Column(Float, nullable=True, index=True)  # TMDb popularity score
    
    # =========================================================================
    # RELEASE INFORMATION
    # =========================================================================
    release_date = Column(Date, nullable=True, index=True)
    release_year = Column(Integer, nullable=True, index=True)
    status = Column(String, nullable=True)  # Released, Post Production, etc.
    
    # =========================================================================
    # RUNTIME & CONTENT
    # =========================================================================
    runtime = Column(Integer, nullable=True)  # Minutes
    adult = Column(Boolean, default=False)  # Adult content flag
    
    # =========================================================================
    # PRODUCTION DETAILS
    # =========================================================================
    budget = Column(Integer, nullable=True)
    revenue = Column(Integer, nullable=True)
    original_language = Column(String, nullable=True)
    original_title = Column(String, nullable=True)
    
    # Production companies as JSON array
    # Example: [{"id": 123, "name": "Warner Bros."}]
    production_companies = Column(JSON, nullable=True)
    
    # Production countries as JSON array
    # Example: [{"iso_3166_1": "US", "name": "United States"}]
    production_countries = Column(JSON, nullable=True)
    
    # Spoken languages as JSON array
    # Example: [{"iso_639_1": "en", "name": "English"}]
    spoken_languages = Column(JSON, nullable=True)
    
    # =========================================================================
    # CAST & CREW (JSON)
    # =========================================================================
    # Cast as JSON array (top actors)
    # Example: [
    #   {
    #     "id": 123,
    #     "name": "Leonardo DiCaprio",
    #     "character": "Dom Cobb",
    #     "profile_path": "/abc.jpg",
    #     "order": 0
    #   }
    # ]
    cast = Column(JSON, nullable=True)
    
    # Crew as JSON array (director, writers, etc.)
    # Example: [
    #   {
    #     "id": 456,
    #     "name": "Christopher Nolan",
    #     "job": "Director",
    #     "department": "Directing",
    #     "profile_path": "/def.jpg"
    #   }
    # ]
    crew = Column(JSON, nullable=True)
    
    # Quick access fields (denormalized for performance)
    director = Column(String, nullable=True)  # Main director name
    main_actors = Column(JSON, nullable=True)  # Top 5 actor names as array
    
    # =========================================================================
    # VIDEOS (Trailers, Teasers, Clips)
    # =========================================================================
    # Videos as JSON array
    # Example: [
    #   {
    #     "id": "abc123",
    #     "key": "dQw4w9WgXcQ",  # YouTube video ID
    #     "name": "Official Trailer",
    #     "site": "YouTube",
    #     "type": "Trailer",
    #     "size": 1080
    #   }
    # ]
    videos = Column(JSON, nullable=True)
    
    # Quick access to main trailer
    trailer_youtube_key = Column(String, nullable=True)  # YouTube ID
    
    # =========================================================================
    # GENRES (Detailed)
    # =========================================================================
    # Genres as JSON array with IDs
    # Example: [{"id": 28, "name": "Action"}, {"id": 12, "name": "Adventure"}]
    genres = Column(JSON, nullable=True)
    
    # =========================================================================
    # COLLECTIONS
    # =========================================================================
    # If movie is part of a collection (e.g., Marvel Cinematic Universe)
    # Example: {"id": 123, "name": "The Avengers Collection"}
    belongs_to_collection = Column(JSON, nullable=True)
    
    # =========================================================================
    # AI / EMBEDDINGS
    # =========================================================================
    embedding = Column(JSON, nullable=True)
    embedding_model = Column(String, default="paraphrase-multilingual-MiniLM-L12-v2")
    embedding_generated_at = Column(Float, nullable=True)
    
    # =========================================================================
    # METADATA
    # =========================================================================
    homepage = Column(String, nullable=True)  # Official movie website
    
    # Last time TMDb data was fetched
    tmdb_last_updated = Column(Float, nullable=True)
    
    # =========================================================================
    # RELATIONSHIPS
    # =========================================================================
    reviews = relationship("Review", back_populates="movie", cascade="all, delete")
    watchlist_entries = relationship("Watchlist", back_populates="movie", cascade="all, delete")
    
    # =========================================================================
    # COMPUTED PROPERTIES
    # =========================================================================
    
    @property
    def review_count(self) -> int:
        """Get number of reviews"""
        if hasattr(self, 'reviews') and self.reviews is not None:
            try:
                return len(self.reviews)
            except:
                pass
        return 0
    
    @property
    def poster_url_large(self) -> Optional[str]:
        """Get large poster (w780)"""
        if self.poster_path:
            return f"https://image.tmdb.org/t/p/w780{self.poster_path}"
        return self.poster_url
    
    @property
    def poster_url_small(self) -> Optional[str]:
        """Get small poster (w185)"""
        if self.poster_path:
            return f"https://image.tmdb.org/t/p/w185{self.poster_path}"
        return self.poster_url
    
    @property
    def backdrop_url_large(self) -> Optional[str]:
        """Get large backdrop (w1280)"""
        if self.backdrop_path:
            return f"https://image.tmdb.org/t/p/w1280{self.backdrop_path}"
        return self.backdrop_url
    
    @property
    def trailer_url(self) -> Optional[str]:
        """Get YouTube trailer URL"""
        if self.trailer_youtube_key:
            return f"https://www.youtube.com/watch?v={self.trailer_youtube_key}"
        return None
    
    @property
    def trailer_embed_url(self) -> Optional[str]:
        """Get embeddable YouTube URL"""
        if self.trailer_youtube_key:
            return f"https://www.youtube.com/embed/{self.trailer_youtube_key}"
        return None
    
    @property
    def get_director(self) -> Optional[str]:
        """Extract director from crew"""
        if self.director:
            return self.director
        
        if self.crew:
            for person in self.crew:
                if person.get('job') == 'Director':
                    return person.get('name')
        
        return None
    
    @property
    def get_top_actors(self) -> List[str]:
        """Get list of top actor names"""
        if self.main_actors:
            return self.main_actors
        
        if self.cast:
            return [person.get('name') for person in self.cast[:5] if person.get('name')]
        
        return []
    
    @property
    def runtime_formatted(self) -> Optional[str]:
        """Format runtime as 'Xh Ym'"""
        if not self.runtime:
            return None
        
        hours = self.runtime // 60
        minutes = self.runtime % 60
        
        if hours > 0:
            return f"{hours}h {minutes}m"
        return f"{minutes}m"
    
    @property
    def budget_formatted(self) -> Optional[str]:
        """Format budget with $ and M/B"""
        if not self.budget or self.budget == 0:
            return None
        
        if self.budget >= 1_000_000_000:
            return f"${self.budget / 1_000_000_000:.1f}B"
        elif self.budget >= 1_000_000:
            return f"${self.budget / 1_000_000:.0f}M"
        else:
            return f"${self.budget:,}"
    
    @property
    def revenue_formatted(self) -> Optional[str]:
        """Format revenue with $ and M/B"""
        if not self.revenue or self.revenue == 0:
            return None
        
        if self.revenue >= 1_000_000_000:
            return f"${self.revenue / 1_000_000_000:.1f}B"
        elif self.revenue >= 1_000_000:
            return f"${self.revenue / 1_000_000:.0f}M"
        else:
            return f"${self.revenue:,}"
    
    def __repr__(self):
        return f"<Movie(id={self.id}, title='{self.title}', year={self.release_year})>"