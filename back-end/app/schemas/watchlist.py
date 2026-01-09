# app/schemas/watchlist.py
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class WatchStatusEnum(str, Enum):
    """Watch status options"""
    PLANNED = "planned"
    WATCHING = "watching"
    COMPLETED = "completed"
    DROPPED = "dropped"


class WatchlistCreate(BaseModel):
    """Create/update watchlist entry"""
    movie_id: int = Field(..., gt=0)
    status: WatchStatusEnum


class WatchlistUpdate(BaseModel):
    """Update watchlist status"""
    status: WatchStatusEnum


class WatchlistOut(BaseModel):
    """Watchlist entry response"""
    id: int
    user_id: int
    movie_id: int
    status: WatchStatusEnum
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class WatchlistWithMovie(BaseModel):
    """Watchlist entry with movie details"""
    id: int
    movie_id: int
    status: WatchStatusEnum
    created_at: datetime
    updated_at: datetime
    movie: dict  # Will contain MovieOut data
    
    class Config:
        from_attributes = True