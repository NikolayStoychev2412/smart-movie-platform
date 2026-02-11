# app/schemas/movie.py
"""
Enhanced Movie schemas with full TMDb support
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import date


class MovieBase(BaseModel):
    """Base movie fields"""
    title: str = Field(..., min_length=1, max_length=200)
    genre: str = Field(..., min_length=1, max_length=100)
    summary: str = Field(..., min_length=10, max_length=5000)
    tagline: Optional[str] = Field(None, max_length=500)
    poster_url: Optional[str] = None


class MovieCreate(MovieBase):
    """Create movie - with optional TMDb data"""
    # Bulgarian
    title_bg: Optional[str] = None
    genre_bg: Optional[str] = None
    summary_bg: Optional[str] = None
    tagline_bg: Optional[str] = None
    
    # TMDb IDs
    tmdb_id: Optional[int] = None
    imdb_id: Optional[str] = None
    
    # Images
    poster_path: Optional[str] = None
    backdrop_url: Optional[str] = None
    backdrop_path: Optional[str] = None
    
    # Ratings
    tmdb_rating: Optional[float] = None
    tmdb_vote_count: Optional[int] = None
    popularity: Optional[float] = None
    
    # Release
    release_date: Optional[date] = None
    release_year: Optional[int] = None
    status: Optional[str] = None
    
    # Runtime & Content
    runtime: Optional[int] = None
    adult: bool = False
    
    # Production
    budget: Optional[int] = None
    revenue: Optional[int] = None
    original_language: Optional[str] = None
    original_title: Optional[str] = None
    
    # Complex fields (JSON)
    production_companies: Optional[List[Dict]] = None
    production_countries: Optional[List[Dict]] = None
    spoken_languages: Optional[List[Dict]] = None
    cast: Optional[List[Dict]] = None
    crew: Optional[List[Dict]] = None
    videos: Optional[List[Dict]] = None
    genres: Optional[List[Dict]] = None
    belongs_to_collection: Optional[Dict] = None
    
    # Quick access
    director: Optional[str] = None
    main_actors: Optional[List[str]] = None
    trailer_youtube_key: Optional[str] = None
    
    # Metadata
    homepage: Optional[str] = None


class MovieUpdate(BaseModel):
    """Update movie - all fields optional"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    genre: Optional[str] = None
    summary: Optional[str] = None
    tagline: Optional[str] = None
    poster_url: Optional[str] = None
    
    title_bg: Optional[str] = None
    genre_bg: Optional[str] = None
    summary_bg: Optional[str] = None
    
    runtime: Optional[int] = None
    release_date: Optional[date] = None
    
    cast: Optional[List[Dict]] = None
    crew: Optional[List[Dict]] = None
    videos: Optional[List[Dict]] = None


class MovieOut(BaseModel):
    """Standard movie output"""
    id: int
    
    # Core
    title: str
    genre: str
    summary: str
    tagline: Optional[str] = None
    
    # Bulgarian
    title_bg: Optional[str] = None
    genre_bg: Optional[str] = None
    summary_bg: Optional[str] = None
    tagline_bg: Optional[str] = None
    
    # TMDb IDs
    tmdb_id: Optional[int] = None
    imdb_id: Optional[str] = None
    
    # Images
    poster_url: Optional[str] = None
    backdrop_url: Optional[str] = None
    
    # Ratings
    average_rating: float
    tmdb_rating: Optional[float] = None
    tmdb_vote_count: Optional[int] = None
    popularity: Optional[float] = None
    review_count: int = 0
    
    # Release
    release_date: Optional[date] = None
    release_year: Optional[int] = None
    status: Optional[str] = None
    
    # Runtime
    runtime: Optional[int] = None
    runtime_formatted: Optional[str] = None
    
    class Config:
        from_attributes = True


class MovieDetailOut(MovieOut):
    """Detailed movie output with cast, crew, videos"""
    
    # Production
    budget: Optional[int] = None
    revenue: Optional[int] = None
    budget_formatted: Optional[str] = None
    revenue_formatted: Optional[str] = None
    original_language: Optional[str] = None
    original_title: Optional[str] = None
    
    # Detailed fields
    production_companies: Optional[List[Dict]] = None
    production_countries: Optional[List[Dict]] = None
    spoken_languages: Optional[List[Dict]] = None
    
    # Cast & Crew
    cast: Optional[List[Dict]] = None
    crew: Optional[List[Dict]] = None
    director: Optional[str] = None
    main_actors: Optional[List[str]] = None
    
    # Videos
    videos: Optional[List[Dict]] = None
    trailer_youtube_key: Optional[str] = None
    trailer_url: Optional[str] = None
    trailer_embed_url: Optional[str] = None
    
    # Genres (detailed)
    genres: Optional[List[Dict]] = None
    
    # Collection
    belongs_to_collection: Optional[Dict] = None
    
    # Metadata
    homepage: Optional[str] = None
    adult: bool = False
    
    # Images (multiple sizes)
    poster_path: Optional[str] = None
    backdrop_path: Optional[str] = None
    poster_url_large: Optional[str] = None
    poster_url_small: Optional[str] = None
    backdrop_url_large: Optional[str] = None


