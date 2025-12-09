# app/ai/hybrid_recommender.py
"""
Hybrid recommendation system with watchlist state awareness.

Combines:
1. Content-based filtering (semantic similarity)
2. Collaborative filtering (user ratings)
3. Watchlist states (completed, watching, dropped, planned)
4. Popularity metrics
"""
import logging
from typing import List, Tuple, Optional, Dict
from sqlalchemy.orm import Session
from sqlalchemy import func
import numpy as np

from app.models.movie import Movie
from app.models.review import Review
from app.models.watchlist import Watchlist, WatchStatus
from app.ai.vector_store import get_vector_store
from app.ai.embeddings import get_embedding

logger = logging.getLogger(__name__)


# 🔥 NEW: Watchlist state weights for recommendation
WATCHLIST_WEIGHTS = {
    WatchStatus.COMPLETED: 1.5,   # Strong positive - user invested time to finish
    WatchStatus.WATCHING: 1.0,    # Medium positive - currently engaged
    WatchStatus.DROPPED: -0.5,    # Negative - didn't enjoy enough to finish
    WatchStatus.PLANNED: 0.0      # No signal - just interested, not a taste indicator
}


class HybridRecommender:
    """State-aware hybrid recommendation engine"""
    
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
        Generate personalized recommendations with watchlist state awareness.
        
        Args:
            db: Database session
            user_id: User ID to generate recommendations for
            top_k: Number of recommendations to return
            exclude_watched: Exclude completed/watching movies
            
        Returns:
            List of (Movie, final_score, score_breakdown) tuples
        """
        # Get user's review history and watchlist
        user_reviews = db.query(Review).filter(Review.user_id == user_id).all()
        user_watchlist = db.query(Watchlist).filter(Watchlist.user_id == user_id).all()
        
        # If no history at all, return popular movies
        if not user_reviews and not user_watchlist:
            return self._get_popular_movies(db, top_k)
        
        # Build user preference vector (considers both reviews and watchlist states)
        user_vector = self._build_user_vector_with_states(db, user_reviews, user_watchlist)
        
        if user_vector is None:
            return self._get_popular_movies(db, top_k)
        
        # Get movies to exclude (completed/watching)
        excluded_movie_ids = self._get_excluded_movies(user_reviews, user_watchlist, exclude_watched)
        
        logger.info(f"Excluding {len(excluded_movie_ids)} movies for user {user_id}")
        
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
            # Skip if excluded
            if movie_id in excluded_movie_ids:
                continue
            
            movie = db.query(Movie).filter(Movie.id == movie_id).first()
            if not movie:
                continue
            
            # Calculate hybrid score
            rating_score = self._normalize_rating(movie.average_rating)
            popularity_score = self._normalize_popularity(db, movie.review_count)
            
            final_score = (
                self.content_weight * similarity_score +
                self.rating_weight * rating_score +
                self.popularity_weight * popularity_score
            )
            
            score_breakdown = {
                "content_similarity": round(similarity_score, 3),
                "rating_score": round(rating_score, 3),
                "popularity_score": round(popularity_score, 3),
                "final_score": round(final_score, 3),
                "used_watchlist_states": True
            }
            
            recommendations.append((movie, final_score, score_breakdown))
            
            if len(recommendations) >= top_k:
                break
        
        # Sort by final score
        recommendations.sort(key=lambda x: x[1], reverse=True)
        
        return recommendations[:top_k]
    
    def _build_user_vector_with_states(
        self,
        db: Session,
        user_reviews: List[Review],
        user_watchlist: List[Watchlist]
    ) -> Optional[List[float]]:
        """
        Build user preference vector considering both ratings AND watchlist states.
        
        Weighting strategy:
        - Reviews: rating/5.0 * watchlist_weight (if in watchlist)
        - Reviews: rating/5.0 (if not in watchlist)
        - Watchlist only: base_weight * watchlist_weight
        """
        vectors = []
        weights = []
        
        # Create mapping of movie_id -> watchlist status
        watchlist_map = {w.movie_id: w.status for w in user_watchlist}
        
        # Process reviews (with watchlist state boost/penalty)
        for review in user_reviews:
            vector = self.vector_store.get_vector(review.movie_id)
            if not vector:
                continue
            
            # Base weight from rating
            base_weight = review.rating / 5.0
            
            # Apply watchlist state multiplier if movie is in watchlist
            if review.movie_id in watchlist_map:
                status = watchlist_map[review.movie_id]
                state_multiplier = WATCHLIST_WEIGHTS.get(status, 1.0)
                final_weight = base_weight * state_multiplier
                
                logger.debug(f"Movie {review.movie_id}: rating={review.rating}, "
                           f"status={status}, weight={final_weight:.2f}")
            else:
                final_weight = base_weight
            
            # Handle negative weights (dropped movies)
            if final_weight < 0:
                # Negative signal: invert the vector
                vector = [-v for v in vector]
                final_weight = abs(final_weight)
            
            vectors.append(vector)
            weights.append(final_weight)
        
        # Process watchlist items without reviews
        reviewed_movie_ids = {r.movie_id for r in user_reviews}
        
        for watchlist_entry in user_watchlist:
            if watchlist_entry.movie_id in reviewed_movie_ids:
                continue  # Already processed in reviews
            
            # Skip PLANNED items (they don't indicate taste)
            if watchlist_entry.status == WatchStatus.PLANNED:
                continue
            
            vector = self.vector_store.get_vector(watchlist_entry.movie_id)
            if not vector:
                continue
            
            # Use watchlist state weight with assumed "good" rating (3.5/5.0 = 0.7)
            base_weight = 0.7
            state_multiplier = WATCHLIST_WEIGHTS.get(watchlist_entry.status, 1.0)
            final_weight = base_weight * state_multiplier
            
            logger.debug(f"Watchlist {watchlist_entry.movie_id}: status={watchlist_entry.status}, "
                       f"weight={final_weight:.2f}")
            
            # Handle dropped items
            if final_weight < 0:
                vector = [-v for v in vector]
                final_weight = abs(final_weight)
            
            vectors.append(vector)
            weights.append(final_weight)
        
        if not vectors:
            return None
        
        # Weighted average
        vectors_np = np.array(vectors)
        weights_np = np.array(weights).reshape(-1, 1)
        
        # Filter out zero weights
        non_zero_mask = weights_np.flatten() > 0
        if not np.any(non_zero_mask):
            return None
        
        vectors_np = vectors_np[non_zero_mask]
        weights_np = weights_np[non_zero_mask]
        
        user_vector = np.average(vectors_np, axis=0, weights=weights_np.flatten())
        
        # Normalize
        norm = np.linalg.norm(user_vector)
        if norm > 0:
            user_vector = user_vector / norm
        
        logger.info(f"Built user vector from {len(vectors)} movies "
                   f"(reviews: {len(user_reviews)}, watchlist: {len(user_watchlist)})")
        
        return user_vector.tolist()
    
    def _get_excluded_movies(
        self,
        user_reviews: List[Review],
        user_watchlist: List[Watchlist],
        exclude_watched: bool
    ) -> set:
        """
        Get set of movie IDs to exclude from recommendations.
        
        Excludes:
        - Reviewed movies (always)
        - Completed movies (if exclude_watched)
        - Watching movies (if exclude_watched)
        - Dropped movies are NOT excluded (user might want alternatives)
        - Planned movies are NOT excluded (user might want alternatives or confirmation)
        """
        excluded = set()
        
        # Always exclude reviewed movies
        excluded.update(r.movie_id for r in user_reviews)
        
        # Exclude completed/watching if requested
        if exclude_watched:
            for entry in user_watchlist:
                if entry.status in (WatchStatus.COMPLETED, WatchStatus.WATCHING):
                    excluded.add(entry.movie_id)
        
        return excluded
    
    def get_similar_to_planned(
        self,
        db: Session,
        user_id: int,
        top_k: int = 10
    ) -> List[Tuple[Movie, float, str]]:
        """
        Get recommendations similar to user's planned movies.
        Useful for "Movies like your watchlist" feature.
        
        Returns:
            List of (Movie, similarity_score, reason) tuples
        """
        planned_entries = db.query(Watchlist).filter(
            Watchlist.user_id == user_id,
            Watchlist.status == WatchStatus.PLANNED
        ).all()
        
        if not planned_entries:
            return []
        
        # Get vectors for all planned movies
        planned_vectors = []
        for entry in planned_entries:
            vector = self.vector_store.get_vector(entry.movie_id)
            if vector:
                planned_vectors.append(vector)
        
        if not planned_vectors:
            return []
        
        # Average the planned movie vectors
        avg_vector = np.mean(planned_vectors, axis=0)
        norm = np.linalg.norm(avg_vector)
        if norm > 0:
            avg_vector = avg_vector / norm
        
        # Search for similar movies
        search_results = self.vector_store.search(
            query_vector=avg_vector.tolist(),
            top_k=top_k * 2
        )
        
        # Exclude movies already in any watchlist status
        watchlist_movie_ids = {e.movie_id for e in db.query(Watchlist).filter(
            Watchlist.user_id == user_id
        ).all()}
        
        results = []
        for movie_id, score in search_results:
            if movie_id in watchlist_movie_ids:
                continue
            
            movie = db.query(Movie).filter(Movie.id == movie_id).first()
            if movie:
                results.append((movie, score, "Similar to your planned movies"))
            
            if len(results) >= top_k:
                break
        
        return results
    
    def _normalize_rating(self, rating: float) -> float:
        """Normalize rating to 0-1 scale"""
        return rating / 5.0
    
    def _normalize_popularity(self, db: Session, review_count: int) -> float:
        """Normalize popularity using log scale"""
        if review_count == 0:
            return 0.0
        
        return np.log1p(review_count) / np.log1p(100)  # Assume max ~100 reviews
    
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
                "final_score": round(score, 3),
                "used_watchlist_states": False
            }
            results.append((movie, score, breakdown))
        
        return results
    
    def find_similar_movies(
        self,
        db: Session,
        movie_id: int,
        top_k: int = 10
    ) -> List[Tuple[Movie, float]]:
        """Find movies similar to a given movie (unchanged)"""
        ref_vector = self.vector_store.get_vector(movie_id)
        
        if ref_vector is None:
            return []
        
        search_results = self.vector_store.search(
            query_vector=ref_vector,
            top_k=top_k + 1
        )
        
        results = []
        for mid, score in search_results:
            if mid == movie_id:
                continue
            
            movie = db.query(Movie).filter(Movie.id == mid).first()
            if movie:
                results.append((movie, score))
            
            if len(results) >= top_k:
                break
        
        return results


# Convenience functions
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
    Get state-aware recommendations for a user.
    
    Now considers watchlist statuses:
    - COMPLETED items: 1.5x weight (strong positive)
    - WATCHING items: 1.0x weight (medium positive)
    - DROPPED items: -0.5x weight (negative signal)
    - PLANNED items: 0.0x weight (no taste signal)
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
    """Find similar movies (unchanged)"""
    recommender = HybridRecommender()
    return recommender.find_similar_movies(db, movie_id, top_k)


def get_similar_to_planned(
    db: Session,
    user_id: int,
    top_k: int = 10
) -> List[Tuple[Movie, float, str]]:
    """
    Get movies similar to user's planned watchlist.
    Useful for "You might also like" based on watchlist.
    """
    recommender = HybridRecommender()
    return recommender.get_similar_to_planned(db, user_id, top_k)