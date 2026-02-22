# app/routers/ai_router.py
"""AI-powered features API endpoints."""
import hashlib
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from app.utils.rate_limit import search_rate_limit, recommend_rate_limit, review_rate_limit
from fastapi import APIRouter, Depends, HTTPException, Path, Query, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, field_validator
import bleach # type: ignore

from app.database import get_db
from app.models.user import User
from app.models.movie import Movie
from app.schemas.movie import MovieOut
from app.utils.security import get_current_user

router = APIRouter(prefix="/ai", tags=["AI Features"])


class SearchCache:
    """LRU cache for search results."""
    def __init__(self, max_size: int = 100, ttl_seconds: int = 300):
        self.max_size = max_size
        self.ttl = ttl_seconds
        self._cache: Dict[str, tuple] = {}  # key -> (result, timestamp)

    def _make_key(self, query: str, **kwargs) -> str:
        params = f"{query}:{sorted(kwargs.items())}"
        return hashlib.md5(params.encode()).hexdigest()

    def get(self, query: str, **kwargs) -> Optional[Any]:
        key = self._make_key(query, **kwargs)
        if key not in self._cache:
            return None

        result, timestamp = self._cache[key]
        if datetime.now() - timestamp > timedelta(seconds=self.ttl):
            del self._cache[key]
            return None

        return result

    def set(self, query: str, result: Any, **kwargs):
        if len(self._cache) >= self.max_size:
            oldest_key = min(self._cache, key=lambda k: self._cache[k][1])
            del self._cache[oldest_key]

        key = self._make_key(query, **kwargs)
        self._cache[key] = (result, datetime.now())


# Global cache instances
search_cache = SearchCache(max_size=200, ttl_seconds=300)
mood_cache = SearchCache(max_size=50, ttl_seconds=600)


class RecommendationOut(BaseModel):
    movie: MovieOut
    score: float = Field(..., description="Overall recommendation score (0-1)")
    explanation: dict = Field(..., description="Score breakdown by component")

    class Config:
        from_attributes = True


class SearchResultOut(BaseModel):
    movie: MovieOut
    relevance: float = Field(..., description="Relevance score (0-1)")
    snippet: str = Field(..., description="Relevant excerpt from summary")

    class Config:
        from_attributes = True


class ReviewAnalysisOut(BaseModel):
    sentiment: str = Field(..., description="positive, negative, or neutral")
    confidence: float = Field(..., description="Confidence score (0-1)")
    summary: str = Field(..., description="One-sentence summary")
    keywords: List[str] = Field(..., description="Key themes/words")


class ReviewAnalysisRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=5000)

    @field_validator('text')
    @classmethod
    def sanitize_text(cls, v):
        v = bleach.clean(v, tags=[], strip=True)
        forbidden = ['ignore previous', 'system:', 'assistant:']
        if any(p in v.lower() for p in forbidden):
            raise ValueError('Invalid content')
        return v.strip()


@router.get("/search", response_model=List[SearchResultOut])
def semantic_movie_search(
    request: Request,
    q: str = Query(..., min_length=2, max_length=200, description="Search query"),
    top_k: int = Query(20, ge=1, le=50),
    genre: Optional[str] = Query(None),
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    language: Optional[str] = Query("en", description="Response language (en/bg)"),
    db: Session = Depends(get_db),
    _rate_limit: None = Depends(search_rate_limit)
):
    """
    Semantic search for movies using natural language.

    Supports Bulgarian and English queries.
    Results are cached for 5 minutes.
    """
    # Check cache first (include language in cache key)
    cached = search_cache.get(q, top_k=top_k, genre=genre, min_rating=min_rating, language=language)
    if cached:
        return cached

    try:
        # Build filters
        filters = {}
        if genre:
            filters["genre"] = genre
        if min_rating is not None:
            filters["min_rating"] = min_rating

        from app.ai.semantic_search import semantic_search

        results = semantic_search(
            db,
            query=q,
            top_k=top_k,
            min_score=0.0,
            filters=filters if filters else None
        )

        # Convert to response — use Bulgarian summary for snippets when language=bg
        response = []
        for movie, score, snippet in results:
            if language == "bg" and movie.summary_bg and movie.summary_bg.strip():
                snippet = _truncate(movie.summary_bg, 150)
            response.append(
                SearchResultOut(
                    movie=MovieOut.model_validate(movie),
                    relevance=round(score, 3),
                    snippet=snippet
                )
            )

        # Fallback if no results
        if not response:
            movies = db.query(Movie).filter(
                Movie.summary.ilike(f"%{q}%") | Movie.title.ilike(f"%{q}%")
            ).order_by(Movie.average_rating.desc()).limit(top_k).all()

            response = [
                SearchResultOut(
                    movie=MovieOut.model_validate(movie),
                    relevance=0.5,
                    snippet=_truncate(
                        (movie.summary_bg if language == "bg" and movie.summary_bg else movie.summary),
                        150
                    )
                )
                for movie in movies
            ]

        # Cache response
        search_cache.set(q, response, top_k=top_k, genre=genre, min_rating=min_rating, language=language)

        return response

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search error: {str(e)}"
        )


@router.get("/search/by-mood/{mood}", response_model=List[SearchResultOut])
def search_movies_by_mood(
    mood: str = Path(..., description="Mood (e.g., 'scary', 'funny', 'страшен')"),
    top_k: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    _rate_limit: None = Depends(search_rate_limit),
):
    """
    Find movies matching a mood or emotion.

    Supports Bulgarian and English moods.
    Results cached for 10 minutes.
    """
    # Check cache
    cached = mood_cache.get(mood, top_k=top_k)
    if cached:
        return cached

    try:
        from app.ai.semantic_search import search_by_mood

        results = search_by_mood(db, mood, top_k)

        response = [
            SearchResultOut(
                movie=MovieOut.model_validate(movie),
                relevance=round(score, 3),
                snippet=snippet
            )
            for movie, score, snippet in results
        ]

        # Fallback
        if not response:
            movies = db.query(Movie).filter(
                Movie.summary.ilike(f"%{mood}%")
            ).order_by(Movie.average_rating.desc()).limit(top_k).all()

            response = [
                SearchResultOut(
                    movie=MovieOut.model_validate(movie),
                    relevance=0.5,
                    snippet=_truncate(movie.summary, 150)
                )
                for movie in movies
            ]

        # Cache
        mood_cache.set(mood, response, top_k=top_k)

        return response

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Mood search error: {str(e)}"
        )


@router.get("/recommend/for-me", response_model=List[RecommendationOut])
def get_personalized_recommendations(
    request: Request,
    top_k: int = Query(20, ge=1, le=50),
    exclude_watched: bool = Query(True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _rate_limit: None = Depends(recommend_rate_limit)
):
    """Get personalized movie recommendations based on your history."""
    try:
        from app.ai.hybrid_recommender import recommend_for_user

        results = recommend_for_user(
            db,
            user_id=current_user.id,
            top_k=top_k,
            exclude_watched=exclude_watched
        )

        if not results:
            popular = db.query(Movie).order_by(Movie.average_rating.desc()).limit(top_k).all()
            return [
                RecommendationOut(
                    movie=MovieOut.model_validate(movie),
                    score=movie.average_rating / 5.0,
                    explanation={"reason": "Popular movie"}
                )
                for movie in popular
            ]

        return [
            RecommendationOut(
                movie=MovieOut.model_validate(movie),
                score=round(score, 3),
                explanation=breakdown
            )
            for movie, score, breakdown in results
        ]

    except Exception as e:
        popular = db.query(Movie).order_by(Movie.average_rating.desc()).limit(top_k).all()
        return [
            RecommendationOut(
                movie=MovieOut.model_validate(movie),
                score=movie.average_rating / 5.0,
                explanation={"reason": f"Popular movie (error: {str(e)[:30]})"}
            )
            for movie in popular
        ]


@router.get("/recommend/similar/{movie_id}", response_model=List[RecommendationOut])
def get_similar_movies(
    movie_id: int,
    top_k: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Find movies similar to a specific movie."""
    try:
        from app.ai.hybrid_recommender import find_similar_movies

        results = find_similar_movies(db, movie_id, top_k)

        if not results:
            movie = db.query(Movie).filter(Movie.id == movie_id).first()
            if not movie:
                raise HTTPException(status_code=404, detail="Movie not found")

            similar = db.query(Movie).filter(
                Movie.genre.ilike(f"%{movie.genre}%"),
                Movie.id != movie_id
            ).order_by(Movie.average_rating.desc()).limit(top_k).all()

            return [
                RecommendationOut(
                    movie=MovieOut.model_validate(m),
                    score=0.5,
                    explanation={"method": "genre-based"}
                )
                for m in similar
            ]

        return [
            RecommendationOut(
                movie=MovieOut.model_validate(movie),
                score=round(score, 3),
                explanation={"content_similarity": round(score, 3), "method": "content-based"}
            )
            for movie, score in results
        ]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error: {str(e)}"
        )


@router.post("/analyze-review", response_model=ReviewAnalysisOut)
def analyze_review_sentiment(
    request: Request,
    review_request: ReviewAnalysisRequest,
    _rate_limit: None = Depends(review_rate_limit)
):
    """Analyze sentiment and extract insights from review text."""
    try:
        from app.ai.review_analysis import analyze_review

        result = analyze_review(review_request.text)

        return ReviewAnalysisOut(
            sentiment=result["sentiment"],
            confidence=result["confidence"],
            summary=result["summary"],
            keywords=result["keywords"]
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis error: {str(e)}"
        )


@router.get("/info")
def get_ai_system_info():
    """Get information about the AI system."""
    from app.ai.embeddings import get_model_info

    try:
        from app.ai.vector_store import get_vector_store
        store = get_vector_store()
        stats = store.stats()
    except Exception as e:
        stats = {"error": str(e)}

    return {
        "embeddings": get_model_info(),
        "vector_store": {"type": "FAISS", **stats},
        "cache": {
            "search_entries": len(search_cache._cache),
            "mood_entries": len(mood_cache._cache)
        }
    }


def _truncate(text: str, max_length: int = 150) -> str:
    if not text:
        return ""
    if len(text) <= max_length:
        return text
    return text[:max_length].rsplit(' ', 1)[0] + "..."
