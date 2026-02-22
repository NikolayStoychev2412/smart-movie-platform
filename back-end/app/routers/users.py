# app/routers/users.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserOut
from app.utils.security import hash_password, get_current_user, require_admin
from sqlalchemy.exc import IntegrityError
from app.utils.audit import log_security_event, SecurityEventType

router = APIRouter(prefix="/users", tags=["Users"])


class UserPreferencesIn(BaseModel):
    preferred_genres: Optional[List[str]] = None
    preferred_mood: Optional[str] = None


class UserPreferencesOut(BaseModel):
    preferred_genres: List[str]
    preferred_mood: Optional[str]
    
    class Config:
        from_attributes = True


@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    user: UserCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Register a new user."""
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    hashed_password = hash_password(user.password)
    db_user = User(
        name=user.name,
        email=user.email,
        hashed_password=hashed_password,
        is_admin=False
    )
    
    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        log_security_event(
            SecurityEventType.USER_CREATED,
            user_id=db_user.id,
            user_email=db_user.email,
            ip_address=request.client.host if request.client else "unknown",
            details={"name": db_user.name}
        )
        
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    return db_user


@router.get("/me", response_model=UserOut)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get current user's profile."""
    return current_user


@router.get("/", response_model=list[UserOut])
def get_all_users(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all users."""
    return db.query(User).all()


@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a user by ID (authenticated only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete a user."""
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent deleting yourself
    if db_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    log_security_event(
        SecurityEventType.USER_DELETED,
        user_id=current_user.id,
        user_email=current_user.email,
        ip_address=request.client.host if request.client else "unknown",
        details={
            "deleted_user_id": db_user.id,
            "deleted_user_email": db_user.email
        }
    )
    
    db.delete(db_user)
    db.commit()
    return {"detail": f"User {user_id} deleted successfully"}


class PasswordChangeIn(BaseModel):
    current_password: str
    new_password: str


@router.put("/me/password")
def change_password(
    data: PasswordChangeIn,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change the current user's password."""
    from app.utils.security import verify_password, hash_password as _hash

    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    if len(data.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters"
        )

    current_user.hashed_password = _hash(data.new_password)
    db.commit()

    log_security_event(
        SecurityEventType.PASSWORD_CHANGED,
        user_id=current_user.id,
        user_email=current_user.email,
        ip_address=request.client.host if request.client else "unknown",
    )

    return {"detail": "Password changed successfully"}


@router.patch("/{user_id}/make-admin")
def make_user_admin(
    user_id: int,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Make a user an admin."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_admin = True
    db.commit()
    db.refresh(user)

    log_security_event(
        SecurityEventType.ADMIN_PROMOTED,
        user_id=current_user.id,
        user_email=current_user.email,
        ip_address=request.client.host if request.client else "unknown",
        details={"promoted_user_id": user.id, "promoted_user_email": user.email}
    )

    return {"detail": f"User {user.email} is now an admin"}


@router.patch("/{user_id}/remove-admin")
def remove_user_admin(
    user_id: int,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Remove admin privileges from a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove your own admin privileges"
        )

    user.is_admin = False
    db.commit()
    db.refresh(user)

    log_security_event(
        SecurityEventType.ADMIN_ACTION,
        user_id=current_user.id,
        user_email=current_user.email,
        ip_address=request.client.host if request.client else "unknown",
        details={"action": "admin_demoted", "demoted_user_id": user.id, "demoted_user_email": user.email}
    )

    return {"detail": f"User {user.email} is no longer an admin"}


@router.get("/preferences", response_model=UserPreferencesOut)
def get_user_preferences(
    current_user: User = Depends(get_current_user)
):
    """Get current user's preferences."""
    return UserPreferencesOut(
        preferred_genres=current_user.preferred_genres or [],
        preferred_mood=getattr(current_user, 'preferred_mood', None)
    )


@router.post("/preferences", response_model=UserPreferencesOut)
def save_user_preferences(
    preferences: UserPreferencesIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save user preferences for personalized recommendations."""
    if preferences.preferred_genres is not None:
        current_user.preferred_genres = preferences.preferred_genres

    # Always update mood (None means user cleared their mood selection)
    current_user.preferred_mood = preferences.preferred_mood
    
    db.commit()
    db.refresh(current_user)
    
    return UserPreferencesOut(
        preferred_genres=current_user.preferred_genres or [],
        preferred_mood=getattr(current_user, 'preferred_mood', None)
    )


@router.put("/preferences", response_model=UserPreferencesOut)
def replace_user_preferences(
    preferences: UserPreferencesIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Replace all user preferences."""
    current_user.preferred_genres = preferences.preferred_genres or []
    current_user.preferred_mood = preferences.preferred_mood

    db.commit()
    db.refresh(current_user)

    return UserPreferencesOut(
        preferred_genres=current_user.preferred_genres or [],
        preferred_mood=getattr(current_user, 'preferred_mood', None)
    )


@router.get("/me/stats")
def get_profile_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get profile statistics for the current user."""
    from app.models.review import Review
    from app.models.favorite import Favorite
    from app.models.watchlist import Watchlist, WatchStatus
    from app.models.movie import Movie
    from collections import Counter

    # Get user's reviews
    reviews = db.query(Review).filter(Review.user_id == current_user.id).all()

    # Rating distribution (1-5 stars)
    rating_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for review in reviews:
        rating_key = max(1, min(5, round(review.rating)))
        rating_distribution[rating_key] += 1

    # Get favorites
    favorites = db.query(Favorite).filter(Favorite.user_id == current_user.id).all()
    favorite_movie_ids = [f.movie_id for f in favorites]

    # Get completed movies from watchlist
    completed = db.query(Watchlist).filter(
        Watchlist.user_id == current_user.id,
        Watchlist.status == WatchStatus.COMPLETED
    ).all()
    completed_movie_ids = [w.movie_id for w in completed]

    # Get all watchlist entries
    watchlist = db.query(Watchlist).filter(Watchlist.user_id == current_user.id).all()
    watchlist_movie_ids = [w.movie_id for w in watchlist]

    # Combine all movie IDs for genre analysis
    all_movie_ids = list(set(favorite_movie_ids + completed_movie_ids + watchlist_movie_ids))

    # Get movies for genre analysis
    movies = db.query(Movie).filter(Movie.id.in_(all_movie_ids)).all() if all_movie_ids else []

    # Count genres
    genre_counter = Counter()
    decade_counter = Counter()
    total_runtime = 0

    for movie in movies:
        if movie.genre:
            # Split genres (comma or pipe separated)
            genres = [g.strip() for g in movie.genre.replace('|', ',').split(',')]
            for genre in genres:
                if genre:
                    genre_counter[genre] += 1

        # Count decades
        if movie.release_year:
            decade = (movie.release_year // 10) * 10
            decade_counter[decade] += 1

        # Sum runtime for completed movies
        if movie.id in completed_movie_ids and movie.runtime:
            total_runtime += movie.runtime

    # Get top 5 genres
    top_genres = [{"genre": g, "count": c} for g, c in genre_counter.most_common(5)]

    # Get top decade
    top_decade = decade_counter.most_common(1)[0][0] if decade_counter else None

    # Calculate average rating given
    avg_rating = sum(r.rating for r in reviews) / len(reviews) if reviews else 0

    return {
        "rating_distribution": rating_distribution,
        "top_genres": top_genres,
        "top_decade": top_decade,
        "total_reviews": len(reviews),
        "total_favorites": len(favorites),
        "total_completed": len(completed),
        "total_watchlist": len(watchlist),
        "minutes_watched": total_runtime,
        "average_rating_given": round(avg_rating, 2),
        "preferred_genres": current_user.preferred_genres or [],
        "preferred_mood": getattr(current_user, 'preferred_mood', None),
        "member_since": current_user.created_at.isoformat() if hasattr(current_user, 'created_at') and current_user.created_at else None
    }


@router.get("/me/activity")
def get_recent_activity(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get recent activity feed for the current user."""
    from app.models.review import Review
    from app.models.favorite import Favorite
    from app.models.watchlist import Watchlist
    from app.models.movie import Movie
    from datetime import datetime

    activities = []

    # Get recent reviews
    from sqlalchemy.orm import selectinload

    reviews = db.query(Review).options(
        selectinload(Review.movie)
    ).filter(
        Review.user_id == current_user.id
    ).order_by(Review.created_at.desc()).limit(limit).all()

    for review in reviews:
        movie = review.movie
        if movie:
            activities.append({
                "type": "review",
                "action": "reviewed",
                "movie_id": movie.id,
                "movie_title": movie.title,
                "movie_title_bg": movie.title_bg,
                "movie_poster_path": movie.poster_path,
                "movie_poster_url": movie.poster_url,
                "rating": review.rating,
                "timestamp": review.created_at.isoformat() if review.created_at else None
            })

    # Get recent favorites
    favorites = db.query(Favorite).options(
        selectinload(Favorite.movie)
    ).filter(
        Favorite.user_id == current_user.id
    ).order_by(Favorite.created_at.desc()).limit(limit).all()

    for fav in favorites:
        movie = fav.movie
        if movie:
            activities.append({
                "type": "favorite",
                "action": "favorited",
                "movie_id": movie.id,
                "movie_title": movie.title,
                "movie_title_bg": movie.title_bg,
                "movie_poster_path": movie.poster_path,
                "movie_poster_url": movie.poster_url,
                "timestamp": fav.created_at.isoformat() if fav.created_at else None
            })

    # Get recent watchlist additions
    watchlist_entries = db.query(Watchlist).options(
        selectinload(Watchlist.movie)
    ).filter(
        Watchlist.user_id == current_user.id
    ).order_by(Watchlist.created_at.desc()).limit(limit).all()

    for entry in watchlist_entries:
        movie = entry.movie
        if movie:
            action_map = {
                "planned": "added to watchlist",
                "watching": "started watching",
                "completed": "completed",
                "dropped": "dropped"
            }
            activities.append({
                "type": "watchlist",
                "action": action_map.get(entry.status.value, "added"),
                "status": entry.status.value,
                "movie_id": movie.id,
                "movie_title": movie.title,
                "movie_title_bg": movie.title_bg,
                "movie_poster_path": movie.poster_path,
                "movie_poster_url": movie.poster_url,
                "timestamp": entry.created_at.isoformat() if entry.created_at else None
            })

    # Sort all activities by timestamp (most recent first)
    activities.sort(key=lambda x: x["timestamp"] or "", reverse=True)

    # Return only the requested number
    return activities[:limit]