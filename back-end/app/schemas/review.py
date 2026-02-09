from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ReviewBase(BaseModel):
    rating: float = Field(..., ge=0, le=5)
    comment: str = Field(..., min_length=10, max_length=2000)

class ReviewCreate(ReviewBase):
    pass

class ReviewUpdate(BaseModel):
    rating: Optional[float] = Field(None, ge=0, le=5)
    comment: Optional[str] = Field(None, max_length=2000)

class ReviewOut(ReviewBase):
    id: int
    user_id: int
    movie_id: int
    created_at: datetime
    user_name: Optional[str] = None

    class Config:
        from_attributes = True