# app/ai/hybrid_recommender.py
"""
Hybrid recommendation system combining:
1. Content-based filtering (semantic similarity)
2. Collaborative filtering (user ratings)
3. Popularity metrics
"""
import logging
from typing import List, Tuple, Optional, Dict
from sqlalchemy.orm import Session
from sqlalchemy import func
import numpy as np

from app.models.movie import Movie
from app.models.review import Review
from app.ai.vector_store import get_vector_store
from app.ai.embeddings import get_embedding

logger = logging.getLogger(__name__)


class HybridRecommender:
    """Hybrid recommendation engine"""
    
    def __init__(
        self,
        content_weight: float = 0.6,
        rating_weight: float = 0.3,
        popularity_weight: float = 0.1
    ):
        """
        Initialize recommender with scoring weights.
        
        Args:
            content_weight: Weight for content similarity (0-1)
            rating_weight: Weight for rating score (0-1)
            popularity_weight: Weight for popularity (0-1)
        """
        total = content_weight + rating_weight + popularity_weight
        self.content_weight = content_weight / total
        self.rating_weight = rating_weight / total
        self.popularity_weight = popularity_weight / total
        
        self.vector_store = get_vector_store()
    
    def recommend_for_user(
        self,
        db: Session,
        user_id: int,
        top_k: int = 20,
        exclude_watched: bool = True
    ) -> List[Tuple[Movie, float, Dict]]:
        """
        Generate personalized recommendations for a user.
        
        Args:
            db: Database session
            user_id: User ID to generate recommendations for
            top_k: Number of recommendations to return
            exclude_watched: Exclude movies user has already reviewed
            
        Returns:
            List of (Movie, final_score, score_breakdown) tuples
        """
        # Get user's review history
        user_reviews = db.query(Review).filter(Review.user_id == user_id).all()
        
        if not user_reviews:
            # No history, return popular movies
            return self._get_popular_movies(db, top_k)
        
        # Build user preference vector
        user_vector = self._build_user_vector(db, user_reviews)
        
        if user_vector is None:
            return self._get_popular_movies(db, top_k)
        
        # Get movies user has already reviewed
        reviewed_movie_ids = {r.movie_id for r in user_reviews}
        
        # Search similar movies using vector store
        search_results = self.vector_store.search(
            query_vector=user_vector,
            top_k=top_k * 3  # Get more candidates for filtering
        )
        
        if not search_results:
            return self._get_popular_movies(db, top_k)
        
        # Fetch movie details and calculate hybrid scores
        recommendations = []
        
        for movie_id, similarity_score in search_results:
            # Skip if already reviewed
            if exclude_watched and movie_id in reviewed_movie_ids:
                continue
            
            movie = db.query(Movie).filter(Movie.id == movie_id).first()
            if not movie:
                continue
            
            # Calculate hybrid score
            rating_score = self._normalize_rating(movie.average_rating)
            popularity_score = self._normalize_popularity(db, movie.review_count if hasattr(movie, 'review_count') else 0)
            
            final_score = (
                self.content_weight * similarity_score +
                self.rating_weight * rating_score +
                self.popularity_weight * popularity_score
            )
            
            score_breakdown = {
                "content_similarity": round(similarity_score, 3),
                "rating_score": round(rating_score, 3),
                "popularity_score": round(popularity_score, 3),
                "final_score": round(final_score, 3)
            }
            
            recommendations.append((movie, final_score, score_breakdown))
            
            if len(recommendations) >= top_k:
                break
        
        # Sort by final score
        recommendations.sort(key=lambda x: x[1], reverse=True)
        
        return recommendations[:top_k]
    
    def _build_user_vector(
        self,
        db: Session,
        user_reviews: List[Review]
    ) -> Optional[List[float]]:
        """
        Build user preference vector from their review history.
        Weighted average of movie vectors by user's ratings.
        """
        vectors = []
        weights = []
        
        for review in user_reviews:
            # Get movie vector from store
            vector = self.vector_store.get_vector(review.movie_id)
            
            if vector:
                vectors.append(vector)
                # Weight by rating (normalize to 0-1)
                weights.append(review.rating / 5.0)
        
        if not vectors:
            return None
        
        # Weighted average
        vectors_np = np.array(vectors)
        weights_np = np.array(weights).reshape(-1, 1)
        
        user_vector = np.average(vectors_np, axis=0, weights=weights_np.flatten())
        
        # Normalize
        norm = np.linalg.norm(user_vector)
        if norm > 0:
            user_vector = user_vector / norm
        
        return user_vector.tolist()
    
    def _normalize_rating(self, rating: float) -> float:
        """Normalize rating to 0-1 scale"""
        return rating / 5.0
    
    def _normalize_popularity(self, db: Session, review_count: int) -> float:
        """Normalize popularity using log scale"""
        if review_count == 0:
            return 0.0
        
        # Get max review count for normalization
        max_reviews = db.query(func.max(Movie.review_count)).scalar() if hasattr(Movie, 'review_count') else 1
        if not max_reviews:
            max_reviews = 1
        
        # Log scale to reduce impact of very popular movies
        return np.log1p(review_count) / np.log1p(max_reviews)
    
    def _get_popular_movies(
        self,
        db: Session,
        top_k: int
    ) -> List[Tuple[Movie, float, Dict]]:
        """Fallback: return popular movies when no personalization possible"""
        movies = db.query(Movie).order_by(
            Movie.average_rating.desc()
        ).limit(top_k).all()
        
        results = []
        for movie in movies:
            review_count = getattr(movie, 'review_count', 0)
            score = (movie.average_rating / 5.0) * 0.7 + self._normalize_popularity(db, review_count) * 0.3
            breakdown = {
                "content_similarity": 0.0,
                "rating_score": round(movie.average_rating / 5.0, 3),
                "popularity_score": round(self._normalize_popularity(db, review_count), 3),
                "final_score": round(score, 3)
            }
            results.append((movie, score, breakdown))
        
        return results
    
    def find_similar_movies(
        self,
        db: Session,
        movie_id: int,
        top_k: int = 10
    ) -> List[Tuple[Movie, float]]:
        """
        Find movies similar to a given movie.
        
        Args:
            db: Database session
            movie_id: Reference movie ID
            top_k: Number of similar movies to return
            
        Returns:
            List of (Movie, similarity_score) tuples
        """
        # Get reference movie vector
        ref_vector = self.vector_store.get_vector(movie_id)
        
        if ref_vector is None:
            return []
        
        # Search similar
        search_results = self.vector_store.search(
            query_vector=ref_vector,
            top_k=top_k + 1  # +1 because reference movie will be included
        )
        
        results = []
        for mid, score in search_results:
            if mid == movie_id:  # Skip the reference movie itself
                continue
            
            movie = db.query(Movie).filter(Movie.id == mid).first()
            if movie:
                results.append((movie, score))
            
            if len(results) >= top_k:
                break
        
        return results


def recommend_for_user(
    db: Session,
    user_id: int,
    top_k: int = 20,
    exclude_watched: bool = True,
    content_weight: float = 0.6,
    rating_weight: float = 0.3,
    popularity_weight: float = 0.1
) -> List[Tuple[Movie, float, Dict]]:
    """
    Convenience function to get recommendations for a user.
    
    Args:
        db: Database session
        user_id: User ID
        top_k: Number of recommendations
        exclude_watched: Exclude already reviewed movies
        content_weight: Weight for content similarity
        rating_weight: Weight for ratings
        popularity_weight: Weight for popularity
    
    Example:
        >>> recommendations = recommend_for_user(db, user_id=1, top_k=10)
        >>> for movie, score, breakdown in recommendations:
        ...     print(f"{movie.title}: {score:.2f}")
    """
    recommender = HybridRecommender(
        content_weight=content_weight,
        rating_weight=rating_weight,
        popularity_weight=popularity_weight
    )
    return recommender.recommend_for_user(db, user_id, top_k, exclude_watched)


def find_similar_movies(
    db: Session,
    movie_id: int,
    top_k: int = 10
) -> List[Tuple[Movie, float]]:
    """
    Convenience function to find similar movies.
    
    Example:
        >>> similar = find_similar_movies(db, movie_id=5, top_k=10)
        >>> for movie, score in similar:
        ...     print(f"{movie.title}: similarity={score:.2f}")
    """
    recommender = HybridRecommender()
    return recommender.find_similar_movies(db, movie_id, top_k)