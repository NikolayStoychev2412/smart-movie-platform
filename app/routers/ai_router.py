# app/routers/ai_router.py
"""
AI-powered features API endpoints:
- Personalized recommendations
- Semantic search
- Review sentiment analysis
"""
from fastapi import APIRouter, Depends, HTTPException, Path, Query, status,Request
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field,validator
from app.utils.rate_limit import rate_limit_dependency
import bleach
from app.database import get_db
from app.models.user import User
from app.models.movie import Movie
from app.schemas.movie import MovieOut
from app.utils.security import get_current_user
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
                raise ValueError(f'Invalid content detected: potentially malicious pattern')
        
        # Limit repeated characters (prevents prompt flooding)
        import re
        if re.search(r'(.)\1{20,}', v):
            raise ValueError('Text contains too many repeated characters')
        
        return v.strip()


# ============================================================================
# Semantic Search Endpoints
# ============================================================================

@router.get("/search", response_model=List[SearchResultOut])
def semantic_movie_search(
    request: Request,  # ✅ ADD THIS
    q: str = Query(..., min_length=3, description="Natural language search query"),
    top_k: int = Query(20, ge=1, le=50),
    genre: Optional[str] = Query(None, description="Filter by genre"),
    min_rating: Optional[float] = Query(None, ge=0, le=5, description="Minimum average rating"),
    db: Session = Depends(get_db),
    _: None = Depends(lambda r: rate_limit_dependency(r, max_requests=20, window_seconds=60))  # ✅ ADD THIS
):
    """
    Semantic search for movies using natural language.
    """
    try:
        # Build filters dict
        filters = {}
        if genre:
            filters["genre"] = genre
        if min_rating is not None:
            filters["min_rating"] = min_rating
        
        print(f"🔍 Searching for: '{q}' with filters: {filters}")
        
        results = semantic_search(
            db,
            query=q,
            top_k=top_k,
            min_score=0.0,  # Use adaptive threshold
            filters=filters if filters else None
        )
        
        print(f"📊 Got {len(results)} results from semantic_search()")
        
        # Check if results is empty
        if not results:
            print("⚠️ No results from semantic search, using fallback...")
            
            # Simple keyword search fallback
            movies = db.query(Movie).filter(
                Movie.summary.ilike(f"%{q}%") | Movie.title.ilike(f"%{q}%")
            )
            
            if genre:
                movies = movies.filter(Movie.genre.ilike(f"%{genre}%"))
            if min_rating:
                movies = movies.filter(Movie.average_rating >= min_rating)
            
            movies = movies.order_by(Movie.average_rating.desc()).limit(top_k).all()
            
            print(f"📊 Fallback returned {len(movies)} movies")
            
            return [
                SearchResultOut(
                    movie=MovieOut.model_validate(movie),
                    relevance=0.5,
                    snippet=(movie.summary[:150] + "...") if movie.summary and len(movie.summary) > 150 else (movie.summary or "No summary available")
                )
                for movie in movies
            ]
        
        # Convert results to response format
        output = []
        for item in results:
            print(f"🎬 Processing result: {type(item)}, length: {len(item) if isinstance(item, (list, tuple)) else 'N/A'}")
            
            if isinstance(item, tuple) and len(item) == 3:
                movie, score, snippet = item
            elif isinstance(item, tuple) and len(item) == 2:
                movie, score = item
                snippet = movie.summary[:150] + "..." if movie.summary and len(movie.summary) > 150 else (movie.summary or "")
            else:
                print(f"⚠️ Unexpected result format: {item}")
                continue
            
            output.append(
                SearchResultOut(
                    movie=MovieOut.model_validate(movie),
                    relevance=round(score, 3),
                    snippet=snippet
                )
            )
        
        print(f"✅ Returning {len(output)} results")
        return output
    
    except Exception as e:
        import traceback
        print("❌ ERROR in semantic_movie_search:")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search error: {str(e)}"
        )


@router.get("/search/by-mood/{mood}", response_model=List[SearchResultOut])
def search_movies_by_mood(
    mood: str = Path(..., description="Mood/emotion keyword"),
    top_k: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """
    Find movies matching a specific mood or emotion.
    """
    try:
        print(f"🎭 Searching for mood: '{mood}'")
        
        results = search_by_mood(db, mood, top_k)
        
        print(f"📊 search_by_mood() returned: {len(results) if results else 0} results")
        print(f"🔍 Results type: {type(results)}")
        
        # 🔥 FIX: Add fallback for empty results
        if not results:
            print("⚠️ No results from mood search, using keyword fallback...")
            
            # Fallback: search for mood keyword in summaries
            movies = db.query(Movie).filter(
                Movie.summary.ilike(f"%{mood}%") | Movie.genre.ilike(f"%{mood}%")
            ).order_by(Movie.average_rating.desc()).limit(top_k).all()
            
            print(f"📊 Fallback returned {len(movies)} movies")
            
            return [
                SearchResultOut(
                    movie=MovieOut.model_validate(movie),
                    relevance=0.5,
                    snippet=(movie.summary[:150] + "...") if movie.summary and len(movie.summary) > 150 else (movie.summary or "No summary available")
                )
                for movie in movies
            ]
        
        # Convert results to response format
        output = []
        for item in results:
            print(f"🎬 Processing mood result: {type(item)}")
            
            if isinstance(item, tuple) and len(item) == 3:
                movie, score, snippet = item
            elif isinstance(item, tuple) and len(item) == 2:
                movie, score = item
                snippet = movie.summary[:150] + "..." if movie.summary and len(movie.summary) > 150 else (movie.summary or "")
            else:
                print(f"⚠️ Unexpected result format: {item}")
                continue
            
            output.append(
                SearchResultOut(
                    movie=MovieOut.model_validate(movie),
                    relevance=round(score, 3),
                    snippet=snippet
                )
            )
        
        print(f"✅ Returning {len(output)} mood results")
        return output
    
    except Exception as e:
        import traceback
        print("❌ ERROR in search_movies_by_mood:")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Mood search error: {str(e)}"
        )


# ============================================================================
# Recommendation Endpoints
# ============================================================================

@router.get("/recommend/for-me", response_model=List[RecommendationOut])
def get_personalized_recommendations(
    request: Request,  # ✅ ADD THIS
    top_k: int = Query(20, ge=1, le=50, description="Number of recommendations"),
    exclude_watched: bool = Query(True, description="Exclude already reviewed movies"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _: None = Depends(lambda r: rate_limit_dependency(r, max_requests=10, window_seconds=60))  # ✅ ADD THIS
):
    """Get personalized movie recommendations based on your review history."""
    try:
        results = recommend_for_user(
            db,
            user_id=current_user.id,
            top_k=top_k,
            exclude_watched=exclude_watched
        )
        
        if not results:
            popular_movies = db.query(Movie).order_by(
                Movie.average_rating.desc()
            ).limit(top_k).all()
            
            return [
                RecommendationOut(
                    movie=MovieOut.model_validate(movie),
                    score=movie.average_rating / 5.0,
                    explanation={
                        "content_similarity": 0.0,
                        "rating_score": movie.average_rating / 5.0,
                        "popularity_score": 0.0,
                        "final_score": movie.average_rating / 5.0,
                        "reason": "Popular movie (no personalization available)"
                    }
                )
                for movie in popular_movies
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
        
        popular_movies = db.query(Movie).order_by(
            Movie.average_rating.desc()
        ).limit(top_k).all()
        
        return [
            RecommendationOut(
                movie=MovieOut.model_validate(movie),
                score=movie.average_rating / 5.0,
                explanation={
                    "content_similarity": 0.0,
                    "rating_score": movie.average_rating / 5.0,
                    "popularity_score": 0.0,
                    "final_score": movie.average_rating / 5.0,
                    "reason": f"Popular movie (AI unavailable: {str(e)[:50]})"
                }
            )
            for movie in popular_movies
        ]


@router.get("/recommend/similar/{movie_id}", response_model=List[RecommendationOut])
def get_similar_movies_endpoint(
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
            
            similar_by_genre = db.query(Movie).filter(
                Movie.genre.ilike(f"%{movie.genre}%"),
                Movie.id != movie_id
            ).order_by(Movie.average_rating.desc()).limit(top_k).all()
            
            return [
                RecommendationOut(
                    movie=MovieOut.model_validate(m),
                    score=0.5,
                    explanation={
                        "content_similarity": 0.5,
                        "method": "genre-based (AI unavailable)",
                        "reason": f"Similar genre: {m.genre}"
                    }
                )
                for m in similar_by_genre
            ]
        
        return [
            RecommendationOut(
                movie=MovieOut.model_validate(movie),
                score=round(score, 3),
                explanation={
                    "content_similarity": round(score, 3),
                    "method": "content-based"
                }
            )
            for movie, score in results
        ]
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error finding similar movies: {str(e)}"
        )


# ============================================================================
# Review Analysis Endpoints
# ============================================================================

@router.post("/analyze-review", response_model=ReviewAnalysisOut)
def analyze_review_sentiment(
    request: Request,  # ✅ ADD THIS
    review_request: ReviewAnalysisRequest,
    db: Session = Depends(get_db),
    _: None = Depends(lambda r: rate_limit_dependency(r, max_requests=30, window_seconds=60))  # ✅ ADD THIS
):
    """Analyze sentiment and extract insights from review text."""
    try:
        result = analyze_review(request.text)
        
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
def get_movie_review_insights(
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
    
    return {
        "movie_id": movie_id,
        **stats
    }


# ============================================================================
# Watchlist-Based Recommendations (NEW)
# ============================================================================

@router.get("/recommend/similar-to-planned", response_model=List[RecommendationOut])
def get_similar_to_planned_movies(
    top_k: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get recommendations similar to movies in your PLANNED watchlist.
    
    **Requires authentication.**
    
    This analyzes movies you've marked as "want to watch" and finds
    similar movies you might also enjoy.
    
    Useful for discovery based on your interests!
    """
    try:
        from app.ai.hybrid_recommender import get_similar_to_planned
        
        results = get_similar_to_planned(db, current_user.id, top_k)
        
        if not results:
            return []
        
        return [
            RecommendationOut(
                movie=MovieOut.model_validate(movie),
                score=round(score, 3),
                explanation={
                    "content_similarity": round(score, 3),
                    "method": "similar-to-planned",
                    "reason": reason
                }
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
def get_ai_system_info():
    """Get information about the AI system configuration."""
    import os
    from app.ai.vector_store import get_vector_store
    
    try:
        vector_store = get_vector_store()
        stats = vector_store.stats()
    except Exception as e:
        stats = {"error": str(e), "total_vectors": 0}
    
    return {
        "embeddings": {
            "provider": os.getenv("EMBEDDINGS_PROVIDER", "sentence-transformers"),
            "model": os.getenv("ST_MODEL_NAME", "all-MiniLM-L6-v2"),
            "dimension": int(os.getenv("EMBEDDING_DIMENSION", "384"))
        },
        "vector_store": {
            "type": "FAISS",
            **stats
        },
        "review_analysis": {
            "provider": os.getenv("REVIEW_ANALYSIS_PROVIDER", "huggingface")
        },
        "features": {
            "personalized_recommendations": True,
            "semantic_search": True,
            "mood_search": True,
            "review_analysis": True,
            "similar_movies": True
        }
    }