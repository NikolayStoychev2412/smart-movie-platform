# app/routers/movies.py
"""
Movies API endpoints with async database and caching.
"""
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_db
from app.models.movie import Movie
from app.models.review import Review
from app.schemas.movie import MovieOut

router = APIRouter(prefix="/movies", tags=["Movies"])


# =============================================================================
# SIMPLE IN-MEMORY CACHE
# =============================================================================

class MovieCache:
    def __init__(self, ttl_seconds: int = 300):
        self.ttl = ttl_seconds
        self._all_movies: Optional[List[dict]] = None
        self._all_movies_timestamp: Optional[datetime] = None
        self._movie_by_id: dict = {}
        self._movie_by_id_timestamp: dict = {}
    
    def get_all(self) -> Optional[List[dict]]:
        if self._all_movies is None:
            return None
        if datetime.now() - self._all_movies_timestamp > timedelta(seconds=self.ttl):
            self._all_movies = None
            return None
        return self._all_movies
    
    def set_all(self, movies: List[dict]):
        self._all_movies = movies
        self._all_movies_timestamp = datetime.now()
    
    def get_by_id(self, movie_id: int) -> Optional[dict]:
        if movie_id not in self._movie_by_id:
            return None
        timestamp = self._movie_by_id_timestamp.get(movie_id)
        if timestamp and datetime.now() - timestamp > timedelta(seconds=self.ttl):
            del self._movie_by_id[movie_id]
            return None
        return self._movie_by_id.get(movie_id)
    
    def set_by_id(self, movie_id: int, movie: dict):
        self._movie_by_id[movie_id] = movie
        self._movie_by_id_timestamp[movie_id] = datetime.now()
    
    def invalidate(self):
        self._all_movies = None
        self._movie_by_id.clear()
        self._movie_by_id_timestamp.clear()


movie_cache = MovieCache(ttl_seconds=300)


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/", response_model=List[MovieOut])
async def get_all_movies(
    skip: int = Query(0, ge=0, description="Number of movies to skip"),
    limit: int = Query(100, ge=1, le=500, description="Max movies to return"),
    db: AsyncSession = Depends(get_async_db)
):
    """Get all movies with pagination."""
    # Check cache first (only for default params)
    if skip == 0 and limit == 100:
        cached = movie_cache.get_all()
        if cached:
            return cached
    
    # Query movies with review count using subquery
    review_count_subq = (
        select(Review.movie_id, func.count(Review.id).label("review_count"))
        .group_by(Review.movie_id)
        .subquery()
    )
    
    query = (
        select(
            Movie.id,
            Movie.title,
            Movie.title_bg,
            Movie.summary,
            Movie.summary_bg,
            Movie.genre,
            Movie.genre_bg,
            Movie.poster_url,
            Movie.average_rating,
            func.coalesce(review_count_subq.c.review_count, 0).label("review_count")
        )
        .outerjoin(review_count_subq, Movie.id == review_count_subq.c.movie_id)
        .order_by(Movie.average_rating.desc())
        .offset(skip)
        .limit(limit)
    )
    
    result = await db.execute(query)
    rows = result.all()
    
    # Convert to dicts
    movie_dicts = [
        {
            "id": row.id,
            "title": row.title,
            "title_bg": row.title_bg,
            "summary": row.summary,
            "summary_bg": row.summary_bg,
            "genre": row.genre,
            "genre_bg": row.genre_bg,
            "poster_url": row.poster_url,
            "average_rating": float(row.average_rating) if row.average_rating else 0.0,
            "review_count": row.review_count or 0,
        }
        for row in rows
    ]
    
    # Cache if default params
    if skip == 0 and limit == 100:
        movie_cache.set_all(movie_dicts)
    
    return movie_dicts


@router.get("/count")
async def get_movie_count(db: AsyncSession = Depends(get_async_db)):
    """Get total number of movies."""
    result = await db.execute(select(func.count(Movie.id)))
    count = result.scalar()
    return {"count": count}


@router.get("/{movie_id}", response_model=MovieOut)
async def get_movie(
    movie_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """Get a single movie by ID."""
    # Check cache
    cached = movie_cache.get_by_id(movie_id)
    if cached:
        return cached
    
    # Query with review count
    review_count_subq = (
        select(func.count(Review.id))
        .where(Review.movie_id == movie_id)
        .scalar_subquery()
    )
    
    query = select(
        Movie.id,
        Movie.title,
        Movie.title_bg,
        Movie.summary,
        Movie.summary_bg,
        Movie.genre,
        Movie.genre_bg,
        Movie.poster_url,
        Movie.average_rating,
        review_count_subq.label("review_count")
    ).where(Movie.id == movie_id)
    
    result = await db.execute(query)
    row = result.first()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Movie with id {movie_id} not found"
        )
    
    movie_dict = {
        "id": row.id,
        "title": row.title,
        "title_bg": row.title_bg,
        "summary": row.summary,
        "summary_bg": row.summary_bg,
        "genre": row.genre,
        "genre_bg": row.genre_bg,
        "poster_url": row.poster_url,
        "average_rating": float(row.average_rating) if row.average_rating else 0.0,
        "review_count": row.review_count or 0,
    }
    
    movie_cache.set_by_id(movie_id, movie_dict)
    return movie_dict


@router.get("/genre/{genre}", response_model=List[MovieOut])
async def get_movies_by_genre(
    genre: str,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_async_db)
):
    """Get movies by genre."""
    review_count_subq = (
        select(Review.movie_id, func.count(Review.id).label("review_count"))
        .group_by(Review.movie_id)
        .subquery()
    )
    
    query = (
        select(
            Movie.id,
            Movie.title,
            Movie.title_bg,
            Movie.summary,
            Movie.summary_bg,
            Movie.genre,
            Movie.genre_bg,
            Movie.poster_url,
            Movie.average_rating,
            func.coalesce(review_count_subq.c.review_count, 0).label("review_count")
        )
        .outerjoin(review_count_subq, Movie.id == review_count_subq.c.movie_id)
        .where(Movie.genre.ilike(f"%{genre}%"))
        .order_by(Movie.average_rating.desc())
        .limit(limit)
    )
    
    result = await db.execute(query)
    rows = result.all()
    
    return [
        {
            "id": row.id,
            "title": row.title,
            "title_bg": row.title_bg,
            "summary": row.summary,
            "summary_bg": row.summary_bg,
            "genre": row.genre,
            "genre_bg": row.genre_bg,
            "poster_url": row.poster_url,
            "average_rating": float(row.average_rating) if row.average_rating else 0.0,
            "review_count": row.review_count or 0,
        }
        for row in rows
    ]


@router.get("/top-rated/", response_model=List[MovieOut])
async def get_top_rated_movies(
    min_reviews: int = Query(5, ge=0, description="Minimum number of reviews"),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_async_db)
):
    """Get top-rated movies with minimum review count."""
    review_count_subq = (
        select(Review.movie_id, func.count(Review.id).label("review_count"))
        .group_by(Review.movie_id)
        .subquery()
    )
    
    query = (
        select(
            Movie.id,
            Movie.title,
            Movie.title_bg,
            Movie.summary,
            Movie.summary_bg,
            Movie.genre,
            Movie.genre_bg,
            Movie.poster_url,
            Movie.average_rating,
            func.coalesce(review_count_subq.c.review_count, 0).label("review_count")
        )
        .outerjoin(review_count_subq, Movie.id == review_count_subq.c.movie_id)
        .where(func.coalesce(review_count_subq.c.review_count, 0) >= min_reviews)
        .order_by(Movie.average_rating.desc())
        .limit(limit)
    )
    
    result = await db.execute(query)
    rows = result.all()
    
    return [
        {
            "id": row.id,
            "title": row.title,
            "title_bg": row.title_bg,
            "summary": row.summary,
            "summary_bg": row.summary_bg,
            "genre": row.genre,
            "genre_bg": row.genre_bg,
            "poster_url": row.poster_url,
            "average_rating": float(row.average_rating) if row.average_rating else 0.0,
            "review_count": row.review_count or 0,
        }
        for row in rows
    ]


@router.post("/cache/invalidate")
async def invalidate_cache():
    """Invalidate movie cache."""
    movie_cache.invalidate()
    return {"status": "cache invalidated"}