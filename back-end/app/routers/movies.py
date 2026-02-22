# app/routers/movies.py
"""
Movies API endpoints with async database and caching.
"""
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_async_db
from app.utils.security import require_admin
from app.models.user import User
from app.models.movie import Movie
from app.models.review import Review
from app.models.favorite import Favorite
from app.models.watchlist import Watchlist, WatchStatus
from app.schemas.movie import MovieOut, MovieDetailOut

router = APIRouter(prefix="/movies", tags=["Movies"])


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


def format_money(amount: Optional[int]) -> Optional[str]:
    """Format budget/revenue with $ and M/B"""
    if not amount or amount == 0:
        return None
    if amount >= 1_000_000_000:
        return f"${amount / 1_000_000_000:.1f}B"
    elif amount >= 1_000_000:
        return f"${amount / 1_000_000:.0f}M"
    else:
        return f"${amount:,}"


def format_runtime(minutes: Optional[int]) -> Optional[str]:
    """Format runtime as 'Xh Ym'"""
    if not minutes:
        return None
    hours = minutes // 60
    mins = minutes % 60
    if hours > 0:
        return f"{hours}h {mins}m"
    return f"{mins}m"


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
    
    # Query movies with review count + favorite count using subqueries
    review_count_subq = (
        select(Review.movie_id, func.count(Review.id).label("review_count"))
        .group_by(Review.movie_id)
        .subquery()
    )
    
    favorite_count_subq = (
        select(Favorite.movie_id, func.count(Favorite.id).label("favorite_count"))
        .group_by(Favorite.movie_id)
        .subquery()
    )
    
    completed_count_subq = (
        select(Watchlist.movie_id, func.count(Watchlist.id).label("completed_count"))
        .where(Watchlist.status == WatchStatus.COMPLETED)
        .group_by(Watchlist.movie_id)
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
            Movie.tagline,
            Movie.tagline_bg,
            Movie.poster_url,
            Movie.poster_path,
            Movie.backdrop_url,
            Movie.backdrop_path,
            Movie.average_rating,
            Movie.tmdb_rating,
            Movie.tmdb_vote_count,
            Movie.release_date,
            Movie.release_year,
            Movie.runtime,
            Movie.popularity,
            func.coalesce(review_count_subq.c.review_count, 0).label("review_count"),
            func.coalesce(favorite_count_subq.c.favorite_count, 0).label("favorite_count"),
            func.coalesce(completed_count_subq.c.completed_count, 0).label("completed_count"),
        )
        .outerjoin(review_count_subq, Movie.id == review_count_subq.c.movie_id)
        .outerjoin(favorite_count_subq, Movie.id == favorite_count_subq.c.movie_id)
        .outerjoin(completed_count_subq, Movie.id == completed_count_subq.c.movie_id)
        .order_by(Movie.popularity.desc())
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
            "tagline": row.tagline,
            "tagline_bg": row.tagline_bg,
            "poster_url": row.poster_url,
            "poster_path": row.poster_path,
            "backdrop_url": row.backdrop_url,
            "backdrop_path": row.backdrop_path,
            "average_rating": float(row.average_rating) if row.average_rating else 0.0,
            "tmdb_rating": float(row.tmdb_rating) if row.tmdb_rating else None,
            "release_date": row.release_date,
            "release_year": row.release_year,
            "runtime": row.runtime,
            "runtime_formatted": format_runtime(row.runtime),
            "popularity": float(row.popularity) if row.popularity else 0.0,
            "tmdb_vote_count": row.tmdb_vote_count or 0,
            "review_count": row.review_count or 0,
            "favorite_count": row.favorite_count or 0,
            "completed_count": row.completed_count or 0,
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


@router.get("/{movie_id}", response_model=MovieDetailOut)
async def get_movie(
    movie_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """Get a single movie by ID with full details."""
    # Check cache
    cached = movie_cache.get_by_id(movie_id)
    if cached:
        return cached
    
    # Query the FULL movie object
    query = select(Movie).where(Movie.id == movie_id)
    result = await db.execute(query)
    movie = result.scalar_one_or_none()
    
    if not movie:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Movie with id {movie_id} not found"
        )
    
    # Count reviews
    review_count_query = select(func.count(Review.id)).where(Review.movie_id == movie_id)
    review_count_result = await db.execute(review_count_query)
    review_count = review_count_result.scalar() or 0
    
    # Build trailer URLs if we have a YouTube key
    trailer_url = None
    trailer_embed_url = None
    if movie.trailer_youtube_key:
        trailer_url = f"https://www.youtube.com/watch?v={movie.trailer_youtube_key}"
        trailer_embed_url = f"https://www.youtube.com/embed/{movie.trailer_youtube_key}"
    
    # Build image URLs
    poster_url_large = None
    poster_url_small = None
    backdrop_url_large = None
    
    if movie.poster_path:
        poster_url_large = f"https://image.tmdb.org/t/p/w780{movie.poster_path}"
        poster_url_small = f"https://image.tmdb.org/t/p/w185{movie.poster_path}"
    
    if movie.backdrop_path:
        backdrop_url_large = f"https://image.tmdb.org/t/p/w1280{movie.backdrop_path}"
    
    # Build full movie dict
    movie_dict = {
        # Core
        "id": movie.id,
        "title": movie.title,
        "title_bg": movie.title_bg,
        "summary": movie.summary,
        "summary_bg": movie.summary_bg,
        "genre": movie.genre,
        "genre_bg": movie.genre_bg,
        "tagline": movie.tagline,
        "tagline_bg": movie.tagline_bg,
        
        # TMDb IDs
        "tmdb_id": movie.tmdb_id,
        "imdb_id": movie.imdb_id,
        
        # Images
        "poster_url": movie.poster_url,
        "poster_path": movie.poster_path,
        "poster_url_large": poster_url_large or movie.poster_url,
        "poster_url_small": poster_url_small or movie.poster_url,
        "backdrop_url": movie.backdrop_url,
        "backdrop_path": movie.backdrop_path,
        "backdrop_url_large": backdrop_url_large or movie.backdrop_url,
        
        # Ratings
        "average_rating": float(movie.average_rating) if movie.average_rating else 0.0,
        "tmdb_rating": float(movie.tmdb_rating) if movie.tmdb_rating else None,
        "tmdb_vote_count": movie.tmdb_vote_count,
        "popularity": float(movie.popularity) if movie.popularity else None,
        "review_count": review_count,
        
        # Release
        "release_date": movie.release_date,
        "release_year": movie.release_year,
        "status": movie.status,
        
        # Runtime
        "runtime": movie.runtime,
        "runtime_formatted": format_runtime(movie.runtime),
        "adult": movie.adult or False,
        
        # Production
        "budget": movie.budget,
        "revenue": movie.revenue,
        "budget_formatted": format_money(movie.budget),
        "revenue_formatted": format_money(movie.revenue),
        "original_language": movie.original_language,
        "original_title": movie.original_title,
        "production_companies": movie.production_companies or [],
        "production_countries": movie.production_countries or [],
        "spoken_languages": movie.spoken_languages or [],
        
        # Cast & Crew
        "cast": movie.cast or [],
        "crew": movie.crew or [],
        "director": movie.director,
        "main_actors": movie.main_actors or [],
        
        # Videos
        "videos": movie.videos or [],
        "trailer_youtube_key": movie.trailer_youtube_key,
        "trailer_url": trailer_url,
        "trailer_embed_url": trailer_embed_url,
        
        # Genres (detailed)
        "genres": movie.genres or [],
        
        # Collection
        "belongs_to_collection": movie.belongs_to_collection,
        
        # Metadata
        "homepage": movie.homepage,
    }
    
    movie_cache.set_by_id(movie_id, movie_dict)
    return movie_dict


@router.get("/{movie_id}/cast")
async def get_movie_cast(
    movie_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """Get cast and crew for a movie."""
    query = select(Movie.cast, Movie.crew, Movie.director).where(Movie.id == movie_id)
    result = await db.execute(query)
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Movie not found")
    
    return {
        "cast": row.cast or [],
        "crew": row.crew or [],
        "director": row.director
    }


@router.get("/{movie_id}/videos")
async def get_movie_videos(
    movie_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """Get videos (trailers, teasers) for a movie."""
    query = select(Movie.videos, Movie.trailer_youtube_key).where(Movie.id == movie_id)
    result = await db.execute(query)
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Movie not found")
    
    trailer_url = None
    trailer_embed_url = None
    if row.trailer_youtube_key:
        trailer_url = f"https://www.youtube.com/watch?v={row.trailer_youtube_key}"
        trailer_embed_url = f"https://www.youtube.com/embed/{row.trailer_youtube_key}"
    
    return {
        "videos": row.videos or [],
        "trailer_youtube_key": row.trailer_youtube_key,
        "trailer_url": trailer_url,
        "trailer_embed_url": trailer_embed_url
    }


@router.get("/{movie_id}/reviews")
async def get_movie_reviews(
    movie_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """Get reviews for a movie."""
    # First check movie exists
    movie_query = select(Movie.id).where(Movie.id == movie_id)
    movie_result = await db.execute(movie_query)
    if not movie_result.first():
        raise HTTPException(status_code=404, detail="Movie not found")
    
    # Get reviews with user relationship loaded
    query = (
        select(Review)
        .options(selectinload(Review.user))
        .where(Review.movie_id == movie_id)
        .order_by(Review.created_at.desc())
    )
    result = await db.execute(query)
    reviews = result.scalars().all()

    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "movie_id": r.movie_id,
            "rating": r.rating,
            "comment": r.comment,
            "created_at": r.created_at,
            "user_name": r.user.name if r.user else "User",
        }
        for r in reviews
    ]


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
            Movie.tagline,
            Movie.tagline_bg,
            Movie.poster_url,
            Movie.poster_path,
            Movie.backdrop_url,
            Movie.average_rating,
            Movie.tmdb_rating,
            Movie.release_date,
            Movie.release_year,
            Movie.runtime,
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
            "tagline": row.tagline,
            "tagline_bg": row.tagline_bg,
            "poster_url": row.poster_url,
            "backdrop_url": row.backdrop_url,
            "average_rating": float(row.average_rating) if row.average_rating else 0.0,
            "tmdb_rating": float(row.tmdb_rating) if row.tmdb_rating else None,
            "release_date": row.release_date,
            "release_year": row.release_year,
            "runtime": row.runtime,
            "runtime_formatted": format_runtime(row.runtime),
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
            Movie.tagline,
            Movie.tagline_bg,
            Movie.poster_url,
            Movie.poster_path,
            Movie.backdrop_url,
            Movie.average_rating,
            Movie.tmdb_rating,
            Movie.release_date,
            Movie.release_year,
            Movie.runtime,
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
            "tagline": row.tagline,
            "tagline_bg": row.tagline_bg,
            "poster_url": row.poster_url,
            "backdrop_url": row.backdrop_url,
            "average_rating": float(row.average_rating) if row.average_rating else 0.0,
            "tmdb_rating": float(row.tmdb_rating) if row.tmdb_rating else None,
            "release_date": row.release_date,
            "release_year": row.release_year,
            "runtime": row.runtime,
            "runtime_formatted": format_runtime(row.runtime),
            "review_count": row.review_count or 0,
        }
        for row in rows
    ]


@router.post("/cache/invalidate")
async def invalidate_cache(
    current_user: User = Depends(require_admin),
):
    """Invalidate movie cache. Admin only."""
    movie_cache.invalidate()
    return {"status": "cache invalidated"}