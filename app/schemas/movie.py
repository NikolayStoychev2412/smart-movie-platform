from pydantic import BaseModel, Field, HttpUrl
from typing import Optional

class MovieBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    genre: str = Field(..., min_length=1, max_length=100)
    summary: str = Field(..., min_length=10, max_length=5000)
    poster_url: Optional[HttpUrl] = None


class MovieCreate(MovieBase):
    pass


class MovieUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    genre: Optional[str] = Field(None, min_length=1, max_length=100)
    summary: Optional[str] = Field(None, min_length=10, max_length=5000)
    poster_url: Optional[HttpUrl] = None


class MovieOut(MovieBase):
    id: int
    average_rating: float
    
    class Config:
        from_attributes = True