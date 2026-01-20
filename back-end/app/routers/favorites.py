# app/routers/favorites.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
from typing import List
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.movie import Movie
from app.models.favorite import Favorite
from app.schemas.movie import MovieOut
from app.utils.security import get_current_user

router = APIRouter(prefix="/favorites", tags=["Favorites"])


class FavoriteOut(BaseModel):
    id: int
    movie_id: int
    created_at: datetime
    movie: MovieOut
    
    class Config:
        from_attributes = True


class FavoriteStatusOut(BaseModel):
    is_favorite: bool
    favorite_id: int | None = None


@router.get("/", response_model=List[FavoriteOut])
def get_user_favorites(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all favorites for the current user"""
    favorites = db.query(Favorite).filter(
        Favorite.user_id == current_user.id
    ).order_by(Favorite.created_at.desc()).all()
    
    return favorites


@router.post("/{movie_id}", response_model=FavoriteOut, status_code=status.HTTP_201_CREATED)
def add_to_favorites(
    movie_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a movie to favorites"""
    # Check if movie exists
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    
    # Create favorite
    favorite = Favorite(
        user_id=current_user.id,
        movie_id=movie_id
    )
    
    try:
        db.add(favorite)
        db.commit()
        db.refresh(favorite)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Movie is already in favorites"
        )
    
    return favorite


@router.delete("/{movie_id}")
def remove_from_favorites(
    movie_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a movie from favorites"""
    favorite = db.query(Favorite).filter(
        Favorite.user_id == current_user.id,
        Favorite.movie_id == movie_id
    ).first()
    
    if not favorite:
        raise HTTPException(status_code=404, detail="Movie not in favorites")
    
    db.delete(favorite)
    db.commit()
    
    return {"detail": "Removed from favorites"}


@router.get("/{movie_id}/status", response_model=FavoriteStatusOut)
def check_favorite_status(
    movie_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if a movie is in user's favorites"""
    favorite = db.query(Favorite).filter(
        Favorite.user_id == current_user.id,
        Favorite.movie_id == movie_id
    ).first()
    
    return FavoriteStatusOut(
        is_favorite=favorite is not None,
        favorite_id=favorite.id if favorite else None
    )