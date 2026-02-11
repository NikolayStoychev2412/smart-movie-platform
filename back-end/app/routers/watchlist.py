# app/routers/watchlist.py
"""
Watchlist management endpoints.
Users can track movies they plan to watch, are watching, completed, or dropped.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, selectinload
from typing import List, Optional

from app.database import get_db
from app.models.user import User
from app.models.movie import Movie
from app.models.watchlist import Watchlist, WatchStatus
from app.schemas.watchlist import (
    WatchlistCreate,
    WatchlistUpdate,
    WatchlistOut,
    WatchStatusEnum
)
from app.schemas.movie import MovieOut
from app.utils.security import get_current_user

router = APIRouter(prefix="/watchlist", tags=["Watchlist"])


@router.post("/", response_model=WatchlistOut, status_code=status.HTTP_201_CREATED)
def add_to_watchlist(
    entry: WatchlistCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a movie to your watchlist with a status."""
    movie = db.query(Movie).filter(Movie.id == entry.movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    
    # Check if already in watchlist
    existing = db.query(Watchlist).filter(
        Watchlist.user_id == current_user.id,
        Watchlist.movie_id == entry.movie_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Movie already in watchlist with status: {existing.status}"
        )
    
    # Create watchlist entry
    watchlist_entry = Watchlist(
        user_id=current_user.id,
        movie_id=entry.movie_id,
        status=WatchStatus(entry.status.value)
    )
    
    db.add(watchlist_entry)
    db.commit()
    db.refresh(watchlist_entry)
    
    return watchlist_entry


@router.get("/", response_model=List[dict])
def get_my_watchlist(
    status: Optional[WatchStatusEnum] = Query(None, description="Filter by status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get your watchlist with movie details."""
    query = db.query(Watchlist).options(
        selectinload(Watchlist.movie)
    ).filter(Watchlist.user_id == current_user.id)

    # Filter by status if provided
    if status:
        query = query.filter(Watchlist.status == WatchStatus(status.value))

    # Order by most recent first
    entries = query.order_by(Watchlist.updated_at.desc()).all()

    return [
        {
            "id": entry.id,
            "movie_id": entry.movie_id,
            "status": entry.status.value,
            "created_at": entry.created_at,
            "updated_at": entry.updated_at,
            "movie": MovieOut.model_validate(entry.movie).model_dump()
        }
        for entry in entries
        if entry.movie
    ]


@router.get("/stats")
def get_watchlist_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get statistics about your watchlist"""
    entries = db.query(Watchlist).filter(Watchlist.user_id == current_user.id).all()
    
    stats = {
        "total": len(entries),
        "planned": sum(1 for e in entries if e.status == WatchStatus.PLANNED),
        "watching": sum(1 for e in entries if e.status == WatchStatus.WATCHING),
        "completed": sum(1 for e in entries if e.status == WatchStatus.COMPLETED),
        "dropped": sum(1 for e in entries if e.status == WatchStatus.DROPPED)
    }
    
    # Calculate completion rate
    if stats["completed"] + stats["dropped"] > 0:
        stats["completion_rate"] = round(
            stats["completed"] / (stats["completed"] + stats["dropped"]) * 100,
            1
        )
    else:
        stats["completion_rate"] = 0.0
    
    return stats


@router.put("/{movie_id}", response_model=WatchlistOut)
def update_watchlist_status(
    movie_id: int,
    update: WatchlistUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update the status of a movie in your watchlist."""
    entry = db.query(Watchlist).filter(
        Watchlist.user_id == current_user.id,
        Watchlist.movie_id == movie_id
    ).first()
    
    if not entry:
        raise HTTPException(
            status_code=404,
            detail="Movie not in your watchlist"
        )
    
    entry.status = WatchStatus(update.status.value)
    db.commit()
    db.refresh(entry)
    
    return entry


@router.delete("/{movie_id}")
def remove_from_watchlist(
    movie_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a movie from your watchlist"""
    entry = db.query(Watchlist).filter(
        Watchlist.user_id == current_user.id,
        Watchlist.movie_id == movie_id
    ).first()
    
    if not entry:
        raise HTTPException(
            status_code=404,
            detail="Movie not in your watchlist"
        )
    
    db.delete(entry)
    db.commit()
    
    return {"detail": "Movie removed from watchlist"}


@router.get("/{movie_id}/status", response_model=WatchlistOut)
def get_movie_watchlist_status(
    movie_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if a specific movie is in your watchlist and get its status"""
    entry = db.query(Watchlist).filter(
        Watchlist.user_id == current_user.id,
        Watchlist.movie_id == movie_id
    ).first()
    
    if not entry:
        raise HTTPException(
            status_code=404,
            detail="Movie not in your watchlist"
        )
    
    return entry