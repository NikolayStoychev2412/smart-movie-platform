# app/ai/hybrid_recommender.py
"""
Hybrid recommendation system with:
1. Cold start support (preferred genres from registration)
2. Content-based filtering (semantic similarity)
3. Collaborative filtering (user ratings + similar users)
4. Watchlist states (completed, watching, dropped, planned)
5. Favorites signal (strong positive indicator)
6. Dynamic weight adjustment based on user activity
7. Quality boost (TMDB rating + community rating + favorite count)
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
from app.models.favorite import Favorite
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

# Favorite weight (very strong positive signal)
FAVORITE_WEIGHT = 2.0  # Favorites are strong indicators of taste

# Dynamic weight thresholds
MIN_ACTIVITY_FOR_BEHAVIOR = 3  # After this many activities, start reducing genre weight
FULL_BEHAVIOR_THRESHOLD = 15   # After this many activities, behavior fully dominates

# Quality score weights
QUALITY_WEIGHTS = {
    'tmdb_rating': 0.4,      # TMDB rating (0-10 normalized to 0-1)
    'community_rating': 0.3,  # Your app's average rating (0-5 normalized to 0-1)
    'favorite_boost': 0.3     # Favorite count boost (log normalized)
}

# Confidence constant for community rating
CONFIDENCE_K = 20  # ~20 reviews needed for full confidence


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
    
    def _get_top_user_movie(
        self,
        db: Session,
        user_reviews: List[Review],
        user_watchlist: List[Watchlist],
        user_favorites: List[Favorite] = None
    ) -> Optional[str]:
        """
        Get the best movie title to use in "Because you watched X" explanations.
        Priority: highest rated review > most recent favorite > completed watchlist > watching watchlist
        """
        # First try: highest rated reviewed movie
        if user_reviews:
            best_review = max(user_reviews, key=lambda r: r.rating)
            if best_review.rating >= 3:  # Only use if they liked it
                movie = db.query(Movie).filter(Movie.id == best_review.movie_id).first()
                if movie:
                    return movie.title
        
        # Second try: most recent favorite (strong signal)
        if user_favorites:
            # Sort by created_at descending (most recent first)
            sorted_favorites = sorted(user_favorites, key=lambda f: f.created_at, reverse=True)
            movie = db.query(Movie).filter(Movie.id == sorted_favorites[0].movie_id).first()
            if movie:
                return movie.title
        
        # Third try: most recent completed movie
        completed = [w for w in user_watchlist if w.status == WatchStatus.COMPLETED]
        if completed:
            # Sort by updated_at descending (most recent first)
            completed.sort(key=lambda w: w.updated_at or w.created_at, reverse=True)
            movie = db.query(Movie).filter(Movie.id == completed[0].movie_id).first()
            if movie:
                return movie.title
        
        # Fourth try: currently watching
        watching = [w for w in user_watchlist if w.status == WatchStatus.WATCHING]
        if watching:
            movie = db.query(Movie).filter(Movie.id == watching[0].movie_id).first()
            if movie:
                return movie.title
        
        return None
    
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
        2. Active users (based on watch history + reviews + favorites)
        3. Hybrid (combining all signals)
        4. Quality boost (TMDB rating + community rating + favorite count)
        """
        # Get user with their preferred genres
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return self._get_popular_movies(db, top_k)
        
        # Get user's activity
        user_reviews = db.query(Review).filter(Review.user_id == user_id).all()
        user_watchlist = db.query(Watchlist).filter(Watchlist.user_id == user_id).all()
        user_favorites = db.query(Favorite).filter(Favorite.user_id == user_id).all()
        
        # Calculate activity count (include favorites)
        activity_count = len(user_reviews) + len(user_favorites) + len([
            w for w in user_watchlist 
            if w.status in (WatchStatus.COMPLETED, WatchStatus.WATCHING, WatchStatus.DROPPED)
        ])
        
        # Get preferred genres
        preferred_genres = getattr(user, 'preferred_genres', None) or []
        has_genres = len(preferred_genres) > 0
        
        logger.info(f"User {user_id}: activity={activity_count}, genres={preferred_genres}, favorites={len(user_favorites)}")
        
        # Calculate dynamic weights
        weights = self._calculate_dynamic_weights(activity_count, has_genres)
        logger.info(f"Dynamic weights: {weights}")
        
        # Get the top movie for "Because you watched X" explanations
        top_user_movie = self._get_top_user_movie(db, user_reviews, user_watchlist, user_favorites)
        
        # Pre-calculate favorite counts for all movies (for quality scoring)
        favorite_counts = self._get_movie_favorite_counts(db)
        max_favorites = max(favorite_counts.values()) if favorite_counts else 1
        
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
                genre_text = ', '.join(matched_genres[:2])
                recommendations[movie.id]['reasons'].append({
                    'type': 'genre',
                    'text': f"Because you like {genre_text}",
                    'text_bg': f"Защото харесваш {genre_text}"
                })
        
        # 2. CONTENT-BASED RECOMMENDATIONS (Watch History + Favorites)
        if activity_count > 0 and weights['content'] > 0:
            content_recs = self._get_content_based_recommendations(
                db, user_reviews, user_watchlist, user_favorites, top_k * 2, top_user_movie
            )
            for movie, score, similar_to_title in content_recs:
                if movie.id not in recommendations:
                    recommendations[movie.id] = {
                        'movie': movie,
                        'scores': {},
                        'reasons': []
                    }
                recommendations[movie.id]['scores']['content'] = score * weights['content']
                
                # Use specific movie title or genre-based explanation
                if similar_to_title:
                    recommendations[movie.id]['reasons'].append({
                        'type': 'content',
                        'text': f"Because you watched {similar_to_title}",
                        'text_bg': f"Защото гледахте {similar_to_title}",
                        'based_on': similar_to_title
                    })
                else:
                    # Fallback to genre similarity
                    movie_genre = (movie.genre or '').split(',')[0].strip()
                    if movie_genre:
                        recommendations[movie.id]['reasons'].append({
                            'type': 'content',
                            'text': f"Similar {movie_genre} movie",
                            'text_bg': f"Подобен {movie_genre} филм"
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
                    'text': "Popular among similar users",
                    'text_bg': "Популярен сред подобни потребители"
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
                # Add reason only if no other reasons exist
                if not recommendations[movie.id]['reasons']:
                    recommendations[movie.id]['reasons'].append({
                        'type': 'popularity',
                        'text': "Trending now",
                        'text_bg': "Популярен в момента"
                    })
        
        # Get movies to exclude
        excluded_ids = self._get_excluded_movies(user_reviews, user_watchlist, exclude_watched)
        
        # Calculate final scores with quality boost
        results = []
        for movie_id, data in recommendations.items():
            if movie_id in excluded_ids:
                continue
            
            movie = data['movie']
            
            # Base score from recommendation signals
            base_score = sum(data['scores'].values())
            
            # Quality score boost (TMDB rating + community + favorites)
            quality_score = self._calculate_quality_score(
                movie, 
                favorite_counts.get(movie_id, 0),
                max_favorites
            )
            
            # Final score: 70% recommendation relevance + 30% quality
            total_score = 0.7 * base_score + 0.3 * quality_score
            
            # Build explanation with best reasons first
            # Priority: content (specific movie) > genre > collaborative > popularity
            sorted_reasons = sorted(
                data['reasons'],
                key=lambda r: {'content': 0, 'genre': 1, 'collaborative': 2, 'popularity': 3}.get(r['type'], 4)
            )
            
            explanation = {
                'reasons': [r['text'] for r in sorted_reasons[:3]],
                'reasons_bg': [r['text_bg'] for r in sorted_reasons[:3] if 'text_bg' in r],
                'score_breakdown': {
                    **{k: round(v, 3) for k, v in data['scores'].items()},
                    'quality': round(quality_score, 3)
                },
                'total_score': round(total_score, 3),
                'weights_used': weights,
                'activity_level': 'cold_start' if activity_count < MIN_ACTIVITY_FOR_BEHAVIOR else 'active',
                # Add additional fields for frontend
                'based_on': [r.get('based_on') for r in sorted_reasons if r.get('based_on')][:1],
                'similar_to': next((r.get('based_on') for r in sorted_reasons if r.get('based_on')), None)
            }
            
            results.append((data['movie'], total_score, explanation))
        
        # Sort by score
        results.sort(key=lambda x: x[1], reverse=True)
        
        # If no results, fallback to popular
        if not results:
            return self._get_popular_movies(db, top_k)
        
        return results[:top_k]
    
    def _calculate_quality_score(
        self, 
        movie: Movie, 
        favorite_count: int,
        max_favorites: int
    ) -> float:
        """
        Calculate quality score combining:
        - TMDB rating (reliable external source)
        - Community rating (your app's ratings with confidence weighting)
        - Favorite count (strong engagement signal)
        """
        # TMDB rating (0-10 normalized to 0-1)
        tmdb_norm = (getattr(movie, 'tmdb_rating', None) or 0) / 10.0
        
        # Community rating with confidence weighting
        review_count = getattr(movie, 'review_count', None) or 0
        app_rating = (movie.average_rating or 0) / 5.0  # Normalize 5-star to 0-1
        
        # Confidence: more reviews = more trust in community rating
        confidence = review_count / (review_count + CONFIDENCE_K)
        community_norm = (confidence * app_rating) + ((1 - confidence) * tmdb_norm)
        
        # Favorite boost (log normalized to prevent outliers)
        if max_favorites > 0 and favorite_count > 0:
            import math
            fav_norm = math.log(1 + favorite_count) / math.log(1 + max_favorites)
        else:
            fav_norm = 0
        
        # Weighted combination
        quality = (
            QUALITY_WEIGHTS['tmdb_rating'] * tmdb_norm +
            QUALITY_WEIGHTS['community_rating'] * community_norm +
            QUALITY_WEIGHTS['favorite_boost'] * fav_norm
        )
        
        return quality
    
    def _get_movie_favorite_counts(self, db: Session) -> Dict[int, int]:
        """Get favorite counts for all movies."""
        counts = db.query(
            Favorite.movie_id,
            func.count(Favorite.id).label('count')
        ).group_by(Favorite.movie_id).all()
        
        return {movie_id: count for movie_id, count in counts}
    
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
        user_favorites: List[Favorite],
        limit: int,
        top_user_movie: Optional[str] = None
    ) -> List[Tuple[Movie, float, Optional[str]]]:
        """Get movies similar to what user has watched/reviewed/favorited."""
        # Build user preference vector with watchlist states and favorites
        user_vector = self._build_user_vector_with_states(db, user_reviews, user_watchlist, user_favorites)
        
        if user_vector is None:
            return []
        
        # Get all user's watched movies with their vectors for comparison
        user_movies_data = []
        
        # From reviews (with ratings as weight)
        for review in user_reviews:
            if review.rating >= 3:  # Only positive reviews
                movie = db.query(Movie).filter(Movie.id == review.movie_id).first()
                vector = self.vector_store.get_vector(review.movie_id)
                if movie and vector is not None:
                    user_movies_data.append({
                        'movie': movie,
                        'vector': np.array(vector),
                        'weight': review.rating / 5.0
                    })
        
        # From favorites (strong positive signal)
        favorited_ids = {f.movie_id for f in user_favorites}
        for fav in user_favorites:
            movie = db.query(Movie).filter(Movie.id == fav.movie_id).first()
            vector = self.vector_store.get_vector(fav.movie_id)
            if movie and vector is not None:
                user_movies_data.append({
                    'movie': movie,
                    'vector': np.array(vector),
                    'weight': 1.0  # High weight for favorites
                })
        
        # From watchlist (completed/watching)
        reviewed_ids = {r.movie_id for r in user_reviews}
        for entry in user_watchlist:
            if entry.movie_id in reviewed_ids or entry.movie_id in favorited_ids:
                continue
            if entry.status in (WatchStatus.COMPLETED, WatchStatus.WATCHING):
                movie = db.query(Movie).filter(Movie.id == entry.movie_id).first()
                vector = self.vector_store.get_vector(entry.movie_id)
                if movie and vector is not None:
                    weight = 0.8 if entry.status == WatchStatus.COMPLETED else 0.6
                    user_movies_data.append({
                        'movie': movie,
                        'vector': np.array(vector),
                        'weight': weight
                    })
        
        # Search similar movies
        search_results = self.vector_store.search(
            query_vector=user_vector,
            top_k=limit
        )
        
        # Search similar movies
        search_results = self.vector_store.search(
            query_vector=user_vector,
            top_k=limit
        )
        
        results = []
        for movie_id, score in search_results:
            movie = db.query(Movie).filter(Movie.id == movie_id).first()
            if not movie:
                continue
            
            # Find which user movie this recommendation is most similar to
            similar_title = None
            
            if user_movies_data:
                rec_vector = self.vector_store.get_vector(movie_id)
                if rec_vector is not None:
                    rec_vector = np.array(rec_vector)
                    
                    best_similarity = -1
                    best_movie_title = None
                    
                    for user_movie_data in user_movies_data:
                        # Calculate cosine similarity
                        user_vec = user_movie_data['vector']
                        similarity = np.dot(rec_vector, user_vec) / (
                            np.linalg.norm(rec_vector) * np.linalg.norm(user_vec) + 1e-8
                        )
                        # Weight by user's rating/status
                        weighted_sim = similarity * user_movie_data['weight']
                        
                        if weighted_sim > best_similarity:
                            best_similarity = weighted_sim
                            best_movie_title = user_movie_data['movie'].title
                    
                    if best_movie_title and best_similarity > 0.3:  # Threshold for relevance
                        similar_title = best_movie_title
            
            # Fallback to top_user_movie if no specific match found
            if not similar_title:
                similar_title = top_user_movie
            
            results.append((movie, score, similar_title))
        
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
        user_watchlist: List[Watchlist],
        user_favorites: List[Favorite] = None
    ) -> Optional[List[float]]:
        """Build user preference vector considering ratings, watchlist states, AND favorites."""
        vectors = []
        weights = []
        
        watchlist_map = {w.movie_id: w.status for w in user_watchlist}
        favorite_ids = {f.movie_id for f in (user_favorites or [])}
        
        # Process reviews
        for review in user_reviews:
            vector = self.vector_store.get_vector(review.movie_id)
            if not vector:
                continue
            
            base_weight = review.rating / 5.0
            
            # Apply watchlist state multiplier
            if review.movie_id in watchlist_map:
                status = watchlist_map[review.movie_id]
                state_multiplier = WATCHLIST_WEIGHTS.get(status, 1.0)
                base_weight = base_weight * state_multiplier
            
            # Boost if also favorited (very strong signal)
            if review.movie_id in favorite_ids:
                base_weight = base_weight * FAVORITE_WEIGHT
            
            final_weight = base_weight
            
            if final_weight < 0:
                vector = [-v for v in vector]
                final_weight = abs(final_weight)
            
            vectors.append(vector)
            weights.append(final_weight)
        
        # Process favorites not in reviews (very strong positive signal)
        reviewed_movie_ids = {r.movie_id for r in user_reviews}
        
        for fav in (user_favorites or []):
            if fav.movie_id in reviewed_movie_ids:
                continue  # Already processed with review
            
            vector = self.vector_store.get_vector(fav.movie_id)
            if not vector:
                continue
            
            # Favorites without reviews get high weight
            final_weight = 0.9 * FAVORITE_WEIGHT  # Strong positive
            
            vectors.append(vector)
            weights.append(final_weight)
        
        # Process watchlist items without reviews or favorites
        for entry in user_watchlist:
            if entry.movie_id in reviewed_movie_ids or entry.movie_id in favorite_ids:
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
                'reasons': ['Trending now'],
                'reasons_bg': ['Популярен в момента'],
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