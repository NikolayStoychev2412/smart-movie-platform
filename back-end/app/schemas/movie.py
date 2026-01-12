# app/schemas/movie.py
"""
Movie schemas with Bulgarian support.
"""
from pydantic import BaseModel, Field
from typing import Optional


class MovieBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    genre: str = Field(..., min_length=1, max_length=100)
    summary: str = Field(..., min_length=10, max_length=5000)
    poster_url: Optional[str] = None


class MovieCreate(MovieBase):
    """Create movie - English required, Bulgarian optional"""
    title_bg: Optional[str] = None
    genre_bg: Optional[str] = None
    summary_bg: Optional[str] = None


class MovieUpdate(BaseModel):
    """Update movie"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    genre: Optional[str] = Field(None, min_length=1, max_length=100)
    summary: Optional[str] = Field(None, min_length=10, max_length=5000)
    poster_url: Optional[str] = None
    title_bg: Optional[str] = None
    genre_bg: Optional[str] = None
    summary_bg: Optional[str] = None


class MovieOut(BaseModel):
    """Movie response - includes both languages"""
    id: int
    
    # English
    title: str
    genre: str
    summary: str
    
    # Bulgarian
    title_bg: Optional[str] = None
    genre_bg: Optional[str] = None
    summary_bg: Optional[str] = None
    
    # Common
    poster_url: Optional[str] = None
    average_rating: float
    review_count: int = 0
    
    class Config:
        from_attributes = True