from pydantic import BaseModel, Field
from typing import Optional

class MovieBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    genre: str = Field(..., min_length=1, max_length=100)
    summary: str = Field(..., min_length=10, max_length=5000)
    poster_url: Optional[str] = None  # Changed from HttpUrl - less strict


class MovieCreate(MovieBase):
    pass


class MovieUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    genre: Optional[str] = Field(None, min_length=1, max_length=100)
    summary: Optional[str] = Field(None, min_length=10, max_length=5000)
    poster_url: Optional[str] = None  # Changed from HttpUrl to str


class MovieOut(MovieBase):
    id: int
    average_rating: float
    review_count: int = 0  # Now Movie model has this as a property
    
    class Config:
        from_attributes = True