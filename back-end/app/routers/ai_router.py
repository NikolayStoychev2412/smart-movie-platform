# app/routers/ai_router.py
"""
AI-powered features API endpoints:
- Personalized recommendations
- Semantic search (supports Bulgarian and English!)
- Review sentiment analysis
"""
from fastapi import APIRouter, Depends, HTTPException, Path, Query, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field, validator
import bleach

from app.database import get_db
from app.models.user import User
from app.models.movie import Movie
from app.schemas.movie import MovieOut
from app.utils.security import get_current_user
from app.utils.rate_limit import rate_limit_dependency
from app.ai.hybrid_recommender import recommend_for_user, find_similar_movies
from app.ai.semantic_search import semantic_search, search_by_mood
from app.ai.review_analysis import analyze_review, get_review_statistics

router = APIRouter(prefix="/ai", tags=["AI Features"])


# ============================================================================
# Response Models
# ============================================================================

class RecommendationOut(BaseModel):
    """Recommendation with score breakdown"""
    movie: MovieOut
    score: float = Field(..., description="Overall recommendation score (0-1)")
    explanation: dict = Field(..., description="Score breakdown by component")
    
    class Config:
        from_attributes = True


class SearchResultOut(BaseModel):
    """Semantic search result"""
    movie: MovieOut
    relevance: float = Field(..., description="Relevance score (0-1)")
    snippet: str = Field(..., description="Relevant excerpt from summary")
    
    class Config:
        from_attributes = True


class ReviewAnalysisOut(BaseModel):
    """Review sentiment analysis result"""
    sentiment: str = Field(..., description="positive, negative, or neutral")
    confidence: float = Field(..., description="Confidence score (0-1)")
    summary: str = Field(..., description="One-sentence summary")
    keywords: List[str] = Field(..., description="Key themes/words")


class ReviewAnalysisRequest(BaseModel):
    """Request body for review analysis with sanitization"""
    text: str = Field(..., min_length=10, max_length=5000)
    
    @validator('text')
    def sanitize_and_validate_text(cls, v):
        """Sanitize input and check for prompt injection"""
        # Remove HTML tags
        v = bleach.clean(v, tags=[], strip=True)
        
        # Check for prompt injection patterns
        forbidden_patterns = [
            'ignore previous', 'ignore all previous', 'system:',
            'assistant:', '<|endoftext|>', 'ChatGPT', 'OpenAI',
            '###', '[INST]', '</s>', '<s>'
        ]
        
        v_lower = v.lower()
        for pattern in forbidden_patterns:
            if pattern.lower() in v_lower:
                raise ValueError('Invalid content detected')
        
        # Limit repeated characters
        import re
        if re.search(r'(.)\1{20,}', v):
            raise ValueError('Text contains too many repeated characters')
        
        return v.strip()


# ============================================================================
# Semantic Search Endpoints
# ============================================================================

@router.get("/search", response_model=List[SearchResultOut])
async def semantic_movie_search(
    request: Request,
    q: str = Query(..., min_length=2, description="Search query (Bulgarian or English)"),
    top_k: int = Query(20, ge=1, le=50),
    genre: Optional[str] = Query(None, description="Filter by genre"),
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    db: Session = Depends(get_db)
):
    """
    Semantic search for movies using natural language.
    
    🌍 Supports Bulgarian and English queries!
    
    Examples:
    - "scary space movies"
    - "страшни филми за космос"
    - "романтична комедия"
    """
    try:
        # Build filters
        filters = {}
        if genre:
            filters["genre"] = genre
        if min_rating is not None:
            filters["min_rating"] = min_rating
        
        # Search (multilingual model handles any language!)
        results = semantic_search(
            db,
            query=q,
            top_k=top_k,
            min_score=0.0,
            filters=filters if filters else None
        )
        
        # Fallback if no results
        if not results:
            # Simple keyword fallback
            movies = db.query(Movie).filter(
                Movie.summary.ilike(f"%{q}%") | Movie.title.ilike(f"%{q}%")
            )
            if genre:
                movies = movies.filter(Movie.genre.ilike(f"%{genre}%"))
            if min_rating:
                movies = movies.filter(Movie.average_rating >= min_rating)
            
            movies = movies.order_by(Movie.average_rating.desc()).limit(top_k).all()
            
            return [
                SearchResultOut(
                    movie=MovieOut.model_validate(movie),
                    relevance=0.5,
                    snippet=_truncate(movie.summary, 150)
                )
                for movie in movies
            ]
        
        # Convert results
        return [
            SearchResultOut(
                movie=MovieOut.model_validate(movie),
                relevance=round(score, 3),
                snippet=snippet
            )
            for movie, score, snippet in results
        ]
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search error: {str(e)}"
        )


@router.get("/search/by-mood/{mood}", response_model=List[SearchResultOut])
async def search_movies_by_mood(
    mood: str = Path(..., description="Mood (e.g., 'scary', 'funny', 'страшен', 'смешен')"),
    top_k: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """
    Find movies matching a mood or emotion.
    
    🌍 Supports Bulgarian and English moods!
    """
    try:
        results = search_by_mood(db, mood, top_k)
        
        if not results:
            # Fallback
            movies = db.query(Movie).filter(
                Movie.summary.ilike(f"%{mood}%") | Movie.genre.ilike(f"%{mood}%")
            ).order_by(Movie.average_rating.desc()).limit(top_k).all()
            
            return [
                SearchResultOut(
                    movie=MovieOut.model_validate(movie),
                    relevance=0.5,
                    snippet=_truncate(movie.summary, 150)
                )
                for movie in movies
            ]
        
        return [
            SearchResultOut(
                movie=MovieOut.model_validate(movie),
                relevance=round(score, 3),
                snippet=snippet
            )
            for movie, score, snippet in results
        ]
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Mood search error: {str(e)}"
        )


# ============================================================================
# Recommendation Endpoints
# ============================================================================

@router.get("/recommend/for-me", response_model=List[RecommendationOut])
async def get_personalized_recommendations(
    request: Request,
    top_k: int = Query(20, ge=1, le=50),
    exclude_watched: bool = Query(True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _rate_limit: None = Depends(lambda req: rate_limit_dependency(req, max_requests=10, window_seconds=60))
):
    """Get personalized movie recommendations based on your history."""
    try:
        results = recommend_for_user(
            db,
            user_id=current_user.id,
            top_k=top_k,
            exclude_watched=exclude_watched
        )
        
        if not results:
            # Fallback to popular movies
            popular = db.query(Movie).order_by(Movie.average_rating.desc()).limit(top_k).all()
            return [
                RecommendationOut(
                    movie=MovieOut.model_validate(movie),
                    score=movie.average_rating / 5.0,
                    explanation={"reason": "Popular movie (no personalization available)"}
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
        import traceback
        traceback.print_exc()
        
        # Fallback
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
async def get_similar_movies(
    movie_id: int,
    top_k: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Find movies similar to a specific movie."""
    try:
        results = find_similar_movies(db, movie_id, top_k)
        
        if not results:
            movie = db.query(Movie).filter(Movie.id == movie_id).first()
            if not movie:
                raise HTTPException(status_code=404, detail="Movie not found")
            
            # Fallback: same genre
            similar = db.query(Movie).filter(
                Movie.genre.ilike(f"%{movie.genre}%"),
                Movie.id != movie_id
            ).order_by(Movie.average_rating.desc()).limit(top_k).all()
            
            return [
                RecommendationOut(
                    movie=MovieOut.model_validate(m),
                    score=0.5,
                    explanation={"method": "genre-based", "reason": f"Same genre: {m.genre}"}
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


# ============================================================================
# Review Analysis Endpoints
# ============================================================================

@router.post("/analyze-review", response_model=ReviewAnalysisOut)
async def analyze_review_sentiment(
    request: Request,
    review_request: ReviewAnalysisRequest,  # ✅ FIXED: Correct variable name
    db: Session = Depends(get_db),
    _rate_limit: None = Depends(lambda req: rate_limit_dependency(req, max_requests=30, window_seconds=60))
):
    """Analyze sentiment and extract insights from review text."""
    try:
        # ✅ FIXED: Use review_request.text, not request.text
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


@router.get("/movie/{movie_id}/review-insights")
async def get_movie_review_insights(
    movie_id: int,
    db: Session = Depends(get_db)
):
    """Get aggregate sentiment insights for all reviews of a movie."""
    from app.models.review import Review
    
    reviews = db.query(Review).filter(
        Review.movie_id == movie_id,
        Review.comment.isnot(None)
    ).all()
    
    if not reviews:
        return {
            "movie_id": movie_id,
            "total_reviews": 0,
            "message": "No reviews with text available"
        }
    
    analyses = [analyze_review(r.comment) for r in reviews if r.comment]
    stats = get_review_statistics(analyses)
    
    return {"movie_id": movie_id, **stats}


# ============================================================================
# Watchlist-Based Recommendations
# ============================================================================

@router.get("/recommend/similar-to-planned", response_model=List[RecommendationOut])
async def get_similar_to_planned(
    top_k: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get recommendations similar to movies in your PLANNED watchlist."""
    try:
        from app.ai.hybrid_recommender import get_similar_to_planned
        
        results = get_similar_to_planned(db, current_user.id, top_k)
        
        if not results:
            return []
        
        return [
            RecommendationOut(
                movie=MovieOut.model_validate(movie),
                score=round(score, 3),
                explanation={"method": "similar-to-planned", "reason": reason}
            )
            for movie, score, reason in results
        ]
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error: {str(e)}"
        )


# ============================================================================
# System Info
# ============================================================================

@router.get("/info")
async def get_ai_system_info():
    """Get information about the AI system configuration."""
    import os
    from app.ai.vector_store import get_vector_store
    from app.ai.embeddings import get_model_info
    
    try:
        vector_store = get_vector_store()
        stats = vector_store.stats()
    except Exception as e:
        stats = {"error": str(e), "total_vectors": 0}
    
    model_info = get_model_info()
    
    return {
        "embeddings": model_info,
        "vector_store": {"type": "FAISS", **stats},
        "features": {
            "personalized_recommendations": True,
            "semantic_search": True,
            "multilingual_search": model_info.get("multilingual", False),
            "mood_search": True,
            "review_analysis": True,
            "similar_movies": True
        }
    }


# ============================================================================
# Helper Functions
# ============================================================================

def _truncate(text: str, max_length: int = 150) -> str:
    """Truncate text with ellipsis"""
    if not text:
        return ""
    if len(text) <= max_length:
        return text
    return text[:max_length].rsplit(' ', 1)[0] + "..."