# app/routers/admin.py
"""
Admin-only endpoints for dashboard stats, review moderation, movie management,
and audit log.

All endpoints are protected by require_admin dependency.
Destructive actions are logged via app.utils.audit for audit trail.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_
from typing import Optional
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.movie import Movie
from app.models.review import Review
from app.models.watchlist import Watchlist
from app.models.favorite import Favorite
from app.utils.security import require_admin
from app.utils.audit import log_security_event, SecurityEventType

router = APIRouter(prefix="/admin", tags=["Admin"])


# ============================================================================
# SCHEMAS
# ============================================================================

class MovieUpdate(BaseModel):
    title: Optional[str] = None
    title_bg: Optional[str] = None
    summary: Optional[str] = None
    summary_bg: Optional[str] = None
    genre: Optional[str] = None
    genre_bg: Optional[str] = None
    tagline: Optional[str] = None
    tagline_bg: Optional[str] = None
    release_date: Optional[str] = None
    runtime: Optional[int] = None
    poster_path: Optional[str] = None
    backdrop_path: Optional[str] = None


# ============================================================================
# HELPERS
# ============================================================================

def _is_empty(val) -> bool:
    """Treat None AND empty/whitespace-only strings as 'missing'."""
    if val is None:
        return True
    if isinstance(val, str) and not val.strip():
        return True
    return False


# ============================================================================
# DASHBOARD STATS
# ============================================================================

@router.get("/stats")
def get_dashboard_stats(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get overview stats for admin dashboard."""
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_movies = db.query(func.count(Movie.id)).scalar() or 0
    total_reviews = db.query(func.count(Review.id)).scalar() or 0
    total_watchlist = db.query(func.count(Watchlist.id)).scalar() or 0
    total_favorites = db.query(func.count(Favorite.id)).scalar() or 0

    # Movies missing Bulgarian translations (None OR empty string)
    missing_bg = db.query(func.count(Movie.id)).filter(
        or_(Movie.title_bg == None, func.trim(Movie.title_bg) == "")
    ).scalar() or 0

    # Movies missing backdrops (None OR empty string on BOTH fields)
    missing_backdrop = db.query(func.count(Movie.id)).filter(
        or_(Movie.backdrop_path == None, func.trim(Movie.backdrop_path) == ""),
        or_(Movie.backdrop_url == None, func.trim(Movie.backdrop_url) == "")
    ).scalar() or 0

    # Movies missing summaries in BG
    missing_summary_bg = db.query(func.count(Movie.id)).filter(
        or_(Movie.summary_bg == None, func.trim(Movie.summary_bg) == "")
    ).scalar() or 0

    # Average rating across all reviews
    avg_rating = db.query(func.avg(Review.rating)).scalar()

    # Most reviewed movies (top 5)
    top_reviewed = (
        db.query(
            Movie.id, Movie.title, Movie.poster_path,
            func.count(Review.id).label("review_count"),
            func.avg(Review.rating).label("avg_rating")
        )
        .join(Review, Review.movie_id == Movie.id)
        .group_by(Movie.id, Movie.title, Movie.poster_path)
        .order_by(desc("review_count"))
        .limit(5)
        .all()
    )

    # Fallback: if no reviews yet, show most popular movies instead
    popular_movies = []
    if not top_reviewed:
        popular_movies_rows = (
            db.query(Movie.id, Movie.title, Movie.poster_path, Movie.popularity)
            .filter(Movie.popularity != None, Movie.popularity > 0)
            .order_by(Movie.popularity.desc())
            .limit(5)
            .all()
        )
        popular_movies = [
            {
                "id": m.id,
                "title": m.title,
                "poster_path": m.poster_path,
                "popularity": round(float(m.popularity), 1) if m.popularity else 0,
            }
            for m in popular_movies_rows
        ]

    # Most active users (top 5 by reviews)
    top_users = (
        db.query(
            User.id, User.name, User.email,
            func.count(Review.id).label("review_count")
        )
        .join(Review, Review.user_id == User.id)
        .group_by(User.id, User.name, User.email)
        .order_by(desc("review_count"))
        .limit(5)
        .all()
    )

    # Recent admin actions (last 10) for dashboard preview
    recent_actions = []
    try:
        from app.utils.audit import get_recent_events
        recent_actions = get_recent_events(limit=10)
    except Exception:
        pass

    return {
        "totals": {
            "users": total_users,
            "movies": total_movies,
            "reviews": total_reviews,
            "watchlist_entries": total_watchlist,
            "favorites": total_favorites,
        },
        "quality": {
            "missing_bg_translation": missing_bg,
            "missing_summary_bg": missing_summary_bg,
            "missing_backdrop": missing_backdrop,
            "avg_review_rating": round(float(avg_rating), 2) if avg_rating else None,
        },
        "top_reviewed_movies": [
            {
                "id": m.id,
                "title": m.title,
                "poster_path": m.poster_path,
                "review_count": m.review_count,
                "avg_rating": round(float(m.avg_rating), 2) if m.avg_rating else None,
            }
            for m in top_reviewed
        ],
        "popular_movies_fallback": popular_movies,
        "top_active_users": [
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "review_count": u.review_count,
            }
            for u in top_users
        ],
        "recent_actions": recent_actions,
    }


# ============================================================================
# REVIEW MODERATION
# ============================================================================

@router.get("/reviews")
def get_all_reviews(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
    search: str = Query("", description="Search by user name/email or movie title"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    """Get all reviews with user and movie info (admin only)."""
    query = (
        db.query(
            Review,
            User.name.label("user_name"),
            User.email.label("user_email"),
            Movie.title.label("movie_title")
        )
        .join(User, Review.user_id == User.id)
        .join(Movie, Review.movie_id == Movie.id)
    )

    if search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                User.name.ilike(term),
                User.email.ilike(term),
                Movie.title.ilike(term),
            )
        )

    total = query.count()

    reviews = (
        query
        .order_by(Review.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return {
        "total": total,
        "reviews": [
            {
                "id": r.Review.id,
                "user_id": r.Review.user_id,
                "user_name": r.user_name,
                "user_email": r.user_email,
                "movie_id": r.Review.movie_id,
                "movie_title": r.movie_title,
                "rating": r.Review.rating,
                "comment": r.Review.content if hasattr(r.Review, 'content') else getattr(r.Review, 'comment', None),
                "created_at": str(r.Review.created_at) if r.Review.created_at else None,
            }
            for r in reviews
        ],
    }


@router.delete("/reviews/{review_id}")
def admin_delete_review(
    review_id: int,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Delete any review (admin only). Recalculates movie average rating."""
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    # Capture info before deletion for audit
    movie_id = review.movie_id
    review_user_id = review.user_id
    review_rating = review.rating
    review_text = ""
    if hasattr(review, 'content') and review.content:
        review_text = review.content[:120]
    elif hasattr(review, 'comment') and review.comment:
        review_text = review.comment[:120]

    # Get names for the audit log
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    movie_title = movie.title if movie else f"Movie #{movie_id}"
    reviewer = db.query(User).filter(User.id == review_user_id).first()
    reviewer_email = reviewer.email if reviewer else f"User #{review_user_id}"

    db.delete(review)
    db.commit()

    # Recalculate movie average rating
    result = db.query(
        func.avg(Review.rating).label("avg"),
        func.count(Review.id).label("cnt")
    ).filter(Review.movie_id == movie_id).first()

    if movie:
        movie.average_rating = round(float(result.avg), 2) if result.avg else 0
        movie.review_count = result.cnt or 0
        db.commit()

    # Audit
    log_security_event(
        SecurityEventType.REVIEW_DELETED,
        user_id=current_user.id,
        user_email=current_user.email,
        ip_address=request.client.host if request.client else "unknown",
        details={
            "action": "delete_review",
            "review_id": review_id,
            "movie_id": movie_id,
            "movie_title": movie_title,
            "reviewer_email": reviewer_email,
            "review_rating": review_rating,
            "review_preview": review_text,
        }
    )

    return {"detail": f"Review {review_id} deleted"}


# ============================================================================
# MOVIE MANAGEMENT
# ============================================================================

@router.get("/movies")
def admin_list_movies(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
    search: str = Query("", description="Search by title (EN or BG)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    """
    Server-side paginated movie list for admin panel.
    Avoids loading all 500+ movies at once.
    """
    query = db.query(Movie)

    if search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Movie.title.ilike(term),
                Movie.title_bg.ilike(term),
            )
        )

    total = query.count()

    movies = (
        query
        .order_by(Movie.popularity.desc().nullslast(), Movie.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return {
        "total": total,
        "movies": [
            {
                "id": m.id,
                "title": m.title,
                "title_bg": m.title_bg,
                "summary": m.summary,
                "summary_bg": m.summary_bg,
                "genre": m.genre,
                "genre_bg": m.genre_bg,
                "tmdb_rating": float(m.tmdb_rating) if m.tmdb_rating else None,
                "average_rating": float(m.average_rating) if m.average_rating else 0.0,
                "review_count": m.review_count or 0,
                "poster_path": m.poster_path,
                "poster_url": m.poster_url,
                "backdrop_path": m.backdrop_path,
                "backdrop_url": m.backdrop_url,
                "release_date": str(m.release_date) if m.release_date else None,
                "release_year": m.release_year,
                "runtime": m.runtime,
                "popularity": float(m.popularity) if m.popularity else 0.0,
            }
            for m in movies
        ],
    }


@router.put("/movies/{movie_id}")
def admin_update_movie(
    movie_id: int,
    data: MovieUpdate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update movie details (admin only). Tracks changed fields in audit log."""
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    update_data = data.dict(exclude_unset=True)
    changed_fields = {}

    for field, value in update_data.items():
        if value is not None:
            old_value = getattr(movie, field, None)
            if str(old_value) != str(value):
                changed_fields[field] = {
                    "old": str(old_value)[:100] if old_value else None,
                    "new": str(value)[:100]
                }
            setattr(movie, field, value)

    # Auto-update quality flags when relevant fields change
    if "title_bg" in update_data or "summary_bg" in update_data:
        has_title = not _is_empty(movie.title_bg)
        movie.has_bg_translation = has_title

    db.commit()
    db.refresh(movie)

    # Only log if something actually changed
    if changed_fields:
        log_security_event(
            SecurityEventType.MOVIE_CREATED,  # reuse; closest existing event type
            user_id=current_user.id,
            user_email=current_user.email,
            ip_address=request.client.host if request.client else "unknown",
            details={
                "action": "update_movie",
                "movie_id": movie_id,
                "movie_title": movie.title,
                "changed_fields": changed_fields,
            }
        )

    return {
        "detail": f"Movie '{movie.title}' updated",
        "movie": {
            "id": movie.id,
            "title": movie.title,
            "title_bg": movie.title_bg,
            "summary_bg": movie.summary_bg,
            "genre": movie.genre,
            "genre_bg": movie.genre_bg,
            "poster_path": movie.poster_path,
            "backdrop_path": movie.backdrop_path,
        }
    }


@router.delete("/movies/{movie_id}")
def admin_delete_movie(
    movie_id: int,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Delete a movie and all related data (admin only).
    
    Safety: cascade works via both:
    1. SQLAlchemy relationship cascade="all, delete-orphan" on Movie model
    2. ForeignKey ondelete="CASCADE" on related tables (Review, Watchlist, Favorite)
    
    We still manually count related rows before deletion for the audit log,
    and do an explicit fallback deletion if cascade somehow misses rows.
    """
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    # Capture info for audit before deletion
    title = movie.title
    tmdb_id = movie.tmdb_id
    review_count = db.query(func.count(Review.id)).filter(Review.movie_id == movie_id).scalar() or 0
    watchlist_count = db.query(func.count(Watchlist.id)).filter(Watchlist.movie_id == movie_id).scalar() or 0
    favorite_count = db.query(func.count(Favorite.id)).filter(Favorite.movie_id == movie_id).scalar() or 0

    # Explicit cleanup (belt-and-suspenders — safe even if cascade isn't set at DB level)
    db.query(Review).filter(Review.movie_id == movie_id).delete(synchronize_session=False)
    db.query(Watchlist).filter(Watchlist.movie_id == movie_id).delete(synchronize_session=False)
    db.query(Favorite).filter(Favorite.movie_id == movie_id).delete(synchronize_session=False)

    db.delete(movie)
    db.commit()

    # Audit
    log_security_event(
        SecurityEventType.MOVIE_DELETED,
        user_id=current_user.id,
        user_email=current_user.email,
        ip_address=request.client.host if request.client else "unknown",
        details={
            "action": "delete_movie",
            "movie_id": movie_id,
            "movie_title": title,
            "tmdb_id": tmdb_id,
            "deleted_reviews": review_count,
            "deleted_watchlist": watchlist_count,
            "deleted_favorites": favorite_count,
        }
    )

    return {"detail": f"Movie '{title}' and all related data deleted"}


# ============================================================================
# AUDIT LOG
# ============================================================================

@router.get("/audit-log")
def get_audit_log(
    current_user: User = Depends(require_admin),
    limit: int = Query(50, ge=1, le=200),
):
    """
    Get recent admin/security events from the audit log.
    Returns newest-first.
    """
    try:
        from app.utils.audit import get_recent_events
        events = get_recent_events(limit=limit)
    except (ImportError, AttributeError):
        # get_recent_events not implemented yet — return empty
        events = []

    return {
        "total": len(events),
        "events": events,
    }