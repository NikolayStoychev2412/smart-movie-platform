# app/ai/hybrid_recommender.py
"""
Hybrid recommendation system with:
1. Cold start support (preferred genres from registration)
2. Content-based filtering (semantic similarity)
3. Collaborative filtering (user ratings + similar users)
4. Watchlist states (completed, watching, dropped, planned)
5. Dynamic weight adjustment based on user activity
"""
import logging
from typing import List, Tuple, Optional, Dict
from sqlalchemy.orm import Session
from sqlalchemy import func
import numpy as np

from app.models.movie import Movie
from app.models.user import User
from app.models.review import Review
from app.models.watchlist import Watchlist, WatchStatus
from app.ai.vector_store import get_vector_store
from app.ai.embeddings import get_embedding

logger = logging.getLogger(__name__)


# Watchlist state weights for recommendation
WATCHLIST_WEIGHTS = {
    WatchStatus.COMPLETED: 1.5,   # Strong positive - user invested time to finish
    WatchStatus.WATCHING: 1.0,    # Medium positive - currently engaged
    WatchStatus.DROPPED: -0.5,    # Negative - didn't enjoy enough to finish
    WatchStatus.PLANNED: 0.0      # No signal - just interested, not a taste indicator
}

# Dynamic weight thresholds
MIN_ACTIVITY_FOR_BEHAVIOR = 3  # After this many activities, start reducing genre weight
FULL_BEHAVIOR_THRESHOLD = 15   # After this many activities, behavior fully dominates


class HybridRecommender:
    """Enhanced hybrid recommendation engine with cold start support"""
    
    def __init__(
        self,
        content_weight: float = 0.5,
        genre_weight: float = 0.2,
        collaborative_weight: float = 0.2,
        popularity_weight: float = 0.1
    ):
        total = content_weight + genre_weight + collaborative_weight + popularity_weight
        self.base_content_weight = content_weight / total
        self.base_genre_weight = genre_weight / total
        self.base_collaborative_weight = collaborative_weight / total
        self.base_popularity_weight = popularity_weight / total
        
        self.vector_store = get_vector_store()
    
    def _calculate_dynamic_weights(self, activity_count: int, has_genres: bool) -> Dict[str, float]:
        """
        Dynamically adjust weights based on user activity.
        
        New users (cold start): rely heavily on preferred genres
        Active users: rely more on behavior (content + collaborative)
        """
        if activity_count < MIN_ACTIVITY_FOR_BEHAVIOR:
            # Cold start: prefer genres if available
            if has_genres:
                return {
                    'content': 0.2,
                    'genre': 0.5,
                    'collaborative': 0.2,
                    'popularity': 0.1
                }
            else:
                # No genres, no activity - pure popularity
                return {
                    'content': 0.1,
                    'genre': 0.0,
                    'collaborative': 0.2,
                    'popularity': 0.7
                }
        
        # Calculate behavior factor (0 to 1)
        behavior_factor = min(
            (activity_count - MIN_ACTIVITY_FOR_BEHAVIOR) / 
            (FULL_BEHAVIOR_THRESHOLD - MIN_ACTIVITY_FOR_BEHAVIOR),
            1.0
        )
        
        # Gradually shift from genre-based to behavior-based
        genre_weight = self.base_genre_weight * (1 - behavior_factor * 0.7)
        content_weight = self.base_content_weight + (behavior_factor * 0.15)
        collaborative_weight = self.base_collaborative_weight + (behavior_factor * 0.1)
        popularity_weight = self.base_popularity_weight
        
        # Normalize
        total = genre_weight + content_weight + collaborative_weight + popularity_weight
        
        return {
            'content': content_weight / total,
            'genre': genre_weight / total,
            'collaborative': collaborative_weight / total,
            'popularity': popularity_weight / total
        }
    
    def recommend_for_user(
        self,
        db: Session,
        user_id: int,
        top_k: int = 20,
        exclude_watched: bool = True
    ) -> List[Tuple[Movie, float, Dict]]:
        """
        Generate personalized recommendations with explanations.
        
        Handles:
        1. Cold start (new users with only genre preferences)
        2. Active users (based on watch history + reviews)
        3. Hybrid (combining all signals)
        """
        # Get user with their preferred genres
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return self._get_popular_movies(db, top_k)
        
        # Get user's activity
        user_reviews = db.query(Review).filter(Review.user_id == user_id).all()
        user_watchlist = db.query(Watchlist).filter(Watchlist.user_id == user_id).all()
        
        # Calculate activity count
        activity_count = len(user_reviews) + len([
            w for w in user_watchlist 
            if w.status in (WatchStatus.COMPLETED, WatchStatus.WATCHING, WatchStatus.DROPPED)
        ])
        
        # Get preferred genres
        preferred_genres = getattr(user, 'preferred_genres', None) or []
        has_genres = len(preferred_genres) > 0
        
        logger.info(f"User {user_id}: activity={activity_count}, genres={preferred_genres}")
        
        # Calculate dynamic weights
        weights = self._calculate_dynamic_weights(activity_count, has_genres)
        logger.info(f"Dynamic weights: {weights}")
        
        # Collect recommendations from each source
        recommendations: Dict[int, Dict] = {}
        
        # 1. GENRE-BASED RECOMMENDATIONS (Cold Start)
        if has_genres and weights['genre'] > 0:
            genre_recs = self._get_genre_based_recommendations(
                db, preferred_genres, top_k * 2
            )
            for movie, score, matched_genres in genre_recs:
                if movie.id not in recommendations:
                    recommendations[movie.id] = {
                        'movie': movie,
                        'scores': {},
                        'reasons': []
                    }
                recommendations[movie.id]['scores']['genre'] = score * weights['genre']
                recommendations[movie.id]['reasons'].append({
                    'type': 'genre',
                    'text': f"Because you like {', '.join(matched_genres[:2])}",
                    'text_bg': f"Защото харесваш {', '.join(matched_genres[:2])}"
                })
        
        # 2. CONTENT-BASED RECOMMENDATIONS (Watch History)
        if activity_count > 0 and weights['content'] > 0:
            content_recs = self._get_content_based_recommendations(
                db, user_reviews, user_watchlist, top_k * 2
            )
            for movie, score, similar_to_title in content_recs:
                if movie.id not in recommendations:
                    recommendations[movie.id] = {
                        'movie': movie,
                        'scores': {},
                        'reasons': []
                    }
                recommendations[movie.id]['scores']['content'] = score * weights['content']
                recommendations[movie.id]['reasons'].append({
                    'type': 'content',
                    'text': f"Because you watched {similar_to_title}",
                    'text_bg': f"Защото гледа {similar_to_title}"
                })
        
        # 3. COLLABORATIVE FILTERING (Similar Users)
        if weights['collaborative'] > 0:
            collab_recs = self._get_collaborative_recommendations(
                db, user, user_reviews, preferred_genres, top_k * 2
            )
            for movie, score in collab_recs:
                if movie.id not in recommendations:
                    recommendations[movie.id] = {
                        'movie': movie,
                        'scores': {},
                        'reasons': []
                    }
                recommendations[movie.id]['scores']['collaborative'] = score * weights['collaborative']
                recommendations[movie.id]['reasons'].append({
                    'type': 'collaborative',
                    'text': "Popular among users like you",
                    'text_bg': "Популярен сред потребители като теб"
                })
        
        # 4. POPULARITY BOOST
        if weights['popularity'] > 0:
            popular_recs = self._get_popular_movies_scored(db, top_k)
            for movie, score in popular_recs:
                if movie.id not in recommendations:
                    recommendations[movie.id] = {
                        'movie': movie,
                        'scores': {},
                        'reasons': []
                    }
                recommendations[movie.id]['scores']['popularity'] = score * weights['popularity']
        
        # Get movies to exclude
        excluded_ids = self._get_excluded_movies(user_reviews, user_watchlist, exclude_watched)
        
        # Calculate final scores and build results
        results = []
        for movie_id, data in recommendations.items():
            if movie_id in excluded_ids:
                continue
            
            total_score = sum(data['scores'].values())
            
            # Build explanation
            explanation = {
                'reasons': [r['text'] for r in data['reasons'][:3]],
                'reasons_bg': [r['text_bg'] for r in data['reasons'][:3] if 'text_bg' in r],
                'score_breakdown': {k: round(v, 3) for k, v in data['scores'].items()},
                'total_score': round(total_score, 3),
                'weights_used': weights,
                'activity_level': 'cold_start' if activity_count < MIN_ACTIVITY_FOR_BEHAVIOR else 'active'
            }
            
            results.append((data['movie'], total_score, explanation))
        
        # Sort by score
        results.sort(key=lambda x: x[1], reverse=True)
        
        # If no results, fallback to popular
        if not results:
            return self._get_popular_movies(db, top_k)
        
        return results[:top_k]
    
    def _get_genre_based_recommendations(
        self,
        db: Session,
        preferred_genres: List[str],
        limit: int
    ) -> List[Tuple[Movie, float, List[str]]]:
        """Get movies matching user's preferred genres."""
        results = []
        seen_ids = set()
        
        for genre in preferred_genres:
            movies = db.query(Movie).filter(
                Movie.genre.ilike(f"%{genre}%")
            ).order_by(Movie.average_rating.desc()).limit(limit // len(preferred_genres) + 5).all()
            
            for movie in movies:
                if movie.id in seen_ids:
                    continue
                seen_ids.add(movie.id)
                
                # Calculate genre match score
                movie_genres = [g.strip().lower() for g in (movie.genre or '').split(',')]
                matched = [g for g in preferred_genres if g.lower() in movie_genres]
                
                genre_match_score = len(matched) / len(preferred_genres)
                rating_score = (movie.average_rating or 0) / 5.0
                
                # Combined score
                score = genre_match_score * 0.6 + rating_score * 0.4
                
                results.append((movie, score, matched))
        
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:limit]
    
    def _get_content_based_recommendations(
        self,
        db: Session,
        user_reviews: List[Review],
        user_watchlist: List[Watchlist],
        limit: int
    ) -> List[Tuple[Movie, float, str]]:
        """Get movies similar to what user has watched/reviewed."""
        # Build user preference vector with watchlist states
        user_vector = self._build_user_vector_with_states(db, user_reviews, user_watchlist)
        
        if user_vector is None:
            return []
        
        # Search similar movies
        search_results = self.vector_store.search(
            query_vector=user_vector,
            top_k=limit
        )
        
        # Get the movie that contributed most to the vector for explanation
        top_movie_title = "your watched movies"
        if user_reviews:
            # Find highest rated movie
            best_review = max(user_reviews, key=lambda r: r.rating)
            best_movie = db.query(Movie).filter(Movie.id == best_review.movie_id).first()
            if best_movie:
                top_movie_title = best_movie.title
        
        results = []
        for movie_id, score in search_results:
            movie = db.query(Movie).filter(Movie.id == movie_id).first()
            if movie:
                results.append((movie, score, top_movie_title))
        
        return results
    
    def _get_collaborative_recommendations(
        self,
        db: Session,
        user: User,
        user_reviews: List[Review],
        preferred_genres: List[str],
        limit: int
    ) -> List[Tuple[Movie, float]]:
        """Get recommendations from similar users."""
        results = []
        
        # Find similar users based on genre preferences
        similar_user_ids = []
        
        if preferred_genres:
            all_users = db.query(User).filter(User.id != user.id).all()
            
            for other in all_users:
                other_genres = getattr(other, 'preferred_genres', None) or []
                if other_genres:
                    overlap = set(preferred_genres) & set(other_genres)
                    if len(overlap) >= 1:
                        similar_user_ids.append(other.id)
        
        # Also find users who watched similar movies
        if user_reviews:
            user_movie_ids = [r.movie_id for r in user_reviews]
            
            similar_by_movies = db.query(Review.user_id).filter(
                Review.movie_id.in_(user_movie_ids),
                Review.user_id != user.id,
                Review.rating >= 4
            ).distinct().all()
            
            similar_user_ids.extend([u[0] for u in similar_by_movies])
        
        similar_user_ids = list(set(similar_user_ids))
        
        if not similar_user_ids:
            return []
        
        # Get highly-rated movies from similar users
        popular_among_similar = db.query(
            Review.movie_id,
            func.avg(Review.rating).label('avg_rating'),
            func.count(Review.id).label('count')
        ).filter(
            Review.user_id.in_(similar_user_ids),
            Review.rating >= 4
        ).group_by(Review.movie_id).order_by(
            func.avg(Review.rating).desc(),
            func.count(Review.id).desc()
        ).limit(limit).all()
        
        for movie_id, avg_rating, count in popular_among_similar:
            movie = db.query(Movie).filter(Movie.id == movie_id).first()
            if movie:
                score = (avg_rating / 5.0) * 0.7 + min(count / 10, 1.0) * 0.3
                results.append((movie, score))
        
        return results
    
    def _get_popular_movies_scored(
        self,
        db: Session,
        limit: int
    ) -> List[Tuple[Movie, float]]:
        """Get popular movies with scores."""
        movies = db.query(Movie).order_by(
            Movie.average_rating.desc()
        ).limit(limit).all()
        
        return [(m, (m.average_rating or 0) / 5.0) for m in movies]
    
    def _build_user_vector_with_states(
        self,
        db: Session,
        user_reviews: List[Review],
        user_watchlist: List[Watchlist]
    ) -> Optional[List[float]]:
        """Build user preference vector considering ratings AND watchlist states."""
        vectors = []
        weights = []
        
        watchlist_map = {w.movie_id: w.status for w in user_watchlist}
        
        # Process reviews
        for review in user_reviews:
            vector = self.vector_store.get_vector(review.movie_id)
            if not vector:
                continue
            
            base_weight = review.rating / 5.0
            
            if review.movie_id in watchlist_map:
                status = watchlist_map[review.movie_id]
                state_multiplier = WATCHLIST_WEIGHTS.get(status, 1.0)
                final_weight = base_weight * state_multiplier
            else:
                final_weight = base_weight
            
            if final_weight < 0:
                vector = [-v for v in vector]
                final_weight = abs(final_weight)
            
            vectors.append(vector)
            weights.append(final_weight)
        
        # Process watchlist items without reviews
        reviewed_movie_ids = {r.movie_id for r in user_reviews}
        
        for entry in user_watchlist:
            if entry.movie_id in reviewed_movie_ids:
                continue
            
            if entry.status == WatchStatus.PLANNED:
                continue
            
            vector = self.vector_store.get_vector(entry.movie_id)
            if not vector:
                continue
            
            base_weight = 0.7
            state_multiplier = WATCHLIST_WEIGHTS.get(entry.status, 1.0)
            final_weight = base_weight * state_multiplier
            
            if final_weight < 0:
                vector = [-v for v in vector]
                final_weight = abs(final_weight)
            
            vectors.append(vector)
            weights.append(final_weight)
        
        if not vectors:
            return None
        
        vectors_np = np.array(vectors)
        weights_np = np.array(weights).reshape(-1, 1)
        
        non_zero_mask = weights_np.flatten() > 0
        if not np.any(non_zero_mask):
            return None
        
        vectors_np = vectors_np[non_zero_mask]
        weights_np = weights_np[non_zero_mask]
        
        user_vector = np.average(vectors_np, axis=0, weights=weights_np.flatten())
        
        norm = np.linalg.norm(user_vector)
        if norm > 0:
            user_vector = user_vector / norm
        
        return user_vector.tolist()
    
    def _get_excluded_movies(
        self,
        user_reviews: List[Review],
        user_watchlist: List[Watchlist],
        exclude_watched: bool
    ) -> set:
        """Get movie IDs to exclude from recommendations."""
        excluded = set()
        
        excluded.update(r.movie_id for r in user_reviews)
        
        if exclude_watched:
            for entry in user_watchlist:
                if entry.status in (WatchStatus.COMPLETED, WatchStatus.WATCHING):
                    excluded.add(entry.movie_id)
        
        return excluded
    
    def _get_popular_movies(
        self,
        db: Session,
        top_k: int
    ) -> List[Tuple[Movie, float, Dict]]:
        """Fallback: return popular movies."""
        movies = db.query(Movie).order_by(
            Movie.average_rating.desc()
        ).limit(top_k).all()
        
        results = []
        for movie in movies:
            score = (movie.average_rating or 0) / 5.0
            explanation = {
                'reasons': ['Popular movie'],
                'reasons_bg': ['Популярен филм'],
                'score_breakdown': {'popularity': round(score, 3)},
                'total_score': round(score, 3),
                'activity_level': 'fallback'
            }
            results.append((movie, score, explanation))
        
        return results
    
    def find_similar_movies(
        self,
        db: Session,
        movie_id: int,
        top_k: int = 10
    ) -> List[Tuple[Movie, float]]:
        """Find movies similar to a given movie."""
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
    exclude_watched: bool = True
) -> List[Tuple[Movie, float, Dict]]:
    """Get hybrid recommendations for a user with explanations."""
    recommender = HybridRecommender()
    return recommender.recommend_for_user(db, user_id, top_k, exclude_watched)


def find_similar_movies(
    db: Session,
    movie_id: int,
    top_k: int = 10
) -> List[Tuple[Movie, float]]:
    """Find similar movies."""
    recommender = HybridRecommender()
    return recommender.find_similar_movies(db, movie_id, top_k)