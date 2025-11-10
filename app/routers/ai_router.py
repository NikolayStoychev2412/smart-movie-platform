# app/routers/ai_router.py
"""
AI-powered features API endpoints:
- Personalized recommendations
- Semantic search
- Review sentiment analysis
"""
from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field

from app.database import get_db
from app.models.user import User
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
    """Request body for review analysis"""
    text: str = Field(..., min_length=10, max_length=5000)


# ============================================================================
# Recommendation Endpoints
# ============================================================================

@router.get("/recommend/for-me", response_model=List[RecommendationOut])
def get_personalized_recommendations(
    top_k: int = Query(20, ge=1, le=50, description="Number of recommendations"),
    exclude_watched: bool = Query(True, description="Exclude already reviewed movies"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get personalized movie recommendations based on your review history.
    
    **Requires authentication.**
    
    The recommendation engine analyzes:
    - Movies you've rated highly
    - Content similarity (plot, themes, style)
    - Overall movie quality and popularity
    
    Returns movies ranked by relevance to your taste.
    """
    try:
        results = recommend_for_user(
            db,
            user_id=current_user.id,
            top_k=top_k,
            exclude_watched=exclude_watched
        )
        
        return [
            RecommendationOut(
                movie=MovieOut.model_validate(movie),
                score=round(score, 3),
                explanation=breakdown
            )
            for movie, score, breakdown in results
        ]
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating recommendations: {str(e)}"
        )


@router.get("/recommend/similar/{movie_id}", response_model=List[RecommendationOut])
def get_similar_movies_endpoint(
    movie_id: int,
    top_k: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """
    Find movies similar to a specific movie.
    
    **Public endpoint** - no authentication required.
    
    Uses content-based filtering to find movies with:
    - Similar plot themes
    - Similar tone and style
    - Similar genre elements
    
    Example: Find movies like "Inception"
    """
    try:
        results = find_similar_movies(db, movie_id, top_k)
        
        if not results:
            raise HTTPException(
                status_code=404,
                detail="Movie not found or no similar movies available"
            )
        
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
# Semantic Search Endpoints
# ============================================================================

@router.get("/search", response_model=List[SearchResultOut])
def semantic_movie_search(
    q: str = Query(..., min_length=3, description="Natural language search query"),
    top_k: int = Query(20, ge=1, le=50),
    min_score: float = Query(0.0, ge=0, le=1, description="Minimum relevance score"),
    genre: Optional[str] = Query(None, description="Filter by genre"),
    min_rating: Optional[float] = Query(None, ge=0, le=5, description="Minimum average rating"),
    db: Session = Depends(get_db)
):
    """
    Semantic search for movies using natural language.
    
    **Public endpoint** - no authentication required.
    
    Unlike keyword search, this understands meaning and context.
    
    **Examples:**
    - "space movies with emotional depth"
    - "dark thrillers about revenge"
    - "feel-good family comedies"
    - "philosophical sci-fi"
    
    **Filters:**
    - `genre`: Partial match on genre field
    - `min_rating`: Only include movies with rating >= this value
    """
    try:
        # Build filters dict
        filters = {}
        if genre:
            filters["genre"] = genre
        if min_rating is not None:
            filters["min_rating"] = min_rating
        
        results = semantic_search(
            db,
            query=q,
            top_k=top_k,
            min_score=min_score,
            filters=filters if filters else None
        )
        
        return [
            SearchResultOut(
                movie=MovieOut.model_validate(movie),
                relevance=round(score, 3),
                snippet=snippet
            )
            for movie, score, snippet in results
        ]
    
    except Exception as e:
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
    
    **Public endpoint** - no authentication required.
    
    **Supported moods:**
    - `uplifting` - Inspiring, feel-good movies
    - `dark` - Intense, gritty thrillers
    - `romantic` - Love stories, heartfelt
    - `funny` - Comedies, humorous
    - `scary` - Horror, suspenseful
    - `sad` - Emotional, tearjerkers
    - `exciting` - Action-packed, thrilling
    - `thoughtful` - Philosophical, deep
    
    You can also use custom mood keywords.
    """
    try:
        results = search_by_mood(db, mood, top_k)
        
        return [
            SearchResultOut(
                movie=MovieOut.model_validate(movie),
                relevance=round(score, 3),
                snippet=snippet
            )
            for movie, score, snippet in results
        ]
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Mood search error: {str(e)}"
        )


# ============================================================================
# Review Analysis Endpoints
# ============================================================================

@router.post("/analyze-review", response_model=ReviewAnalysisOut)
def analyze_review_sentiment(
    request: ReviewAnalysisRequest,
    db: Session = Depends(get_db)
):
    """
    Analyze sentiment and extract insights from review text.
    
    **Public endpoint** - no authentication required.
    
    Returns:
    - **Sentiment**: positive, negative, or neutral
    - **Confidence**: How confident the model is (0-1)
    - **Summary**: One-sentence summary of the review
    - **Keywords**: Key themes and topics mentioned
    
    **Example request:**
```json
    {
      "text": "This movie was absolutely incredible! The acting was superb and the plot kept me engaged throughout."
    }
```
    """
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
    """
    Get aggregate sentiment insights for all reviews of a movie.
    
    **Public endpoint** - no authentication required.
    
    Returns sentiment breakdown and common themes across all reviews.
    """
    from app.models.review import Review
    
    # Get all reviews for this movie
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
    
    # Analyze each review
    analyses = [analyze_review(r.comment) for r in reviews if r.comment]
    
    # Get statistics
    stats = get_review_statistics(analyses)
    
    return {
        "movie_id": movie_id,
        **stats
    }


# ============================================================================
# System Info
# ============================================================================

@router.get("/info")
def get_ai_system_info():
    """
    Get information about the AI system configuration.
    
    **Public endpoint** - no authentication required.
    """
    import os
    from app.ai.vector_store import get_vector_store
    
    vector_store = get_vector_store()
    
    return {
        "embeddings": {
            "provider": os.getenv("EMBEDDINGS_PROVIDER", "sentence-transformers"),
            "model": os.getenv("ST_MODEL_NAME", "all-MiniLM-L6-v2"),
            "dimension": int(os.getenv("EMBEDDING_DIMENSION", "384"))
        },
        "vector_store": {
            "type": "FAISS",
            **vector_store.stats()
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