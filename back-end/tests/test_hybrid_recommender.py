"""Tests for app.ai.hybrid_recommender — scoring and weight logic."""
import pytest
import math
from unittest.mock import patch, MagicMock
from types import SimpleNamespace

from app.ai.hybrid_recommender import (
    HybridRecommender,
    WATCHLIST_WEIGHTS,
    FAVORITE_WEIGHT,
    MOOD_GENRE_MAP,
    MOOD_BOOST,
    MIN_ACTIVITY_FOR_BEHAVIOR,
    FULL_BEHAVIOR_THRESHOLD,
    QUALITY_WEIGHTS,
    CONFIDENCE_K,
)
from app.models.watchlist import WatchStatus
from tests.conftest import make_movie, make_review, make_watchlist_entry, make_favorite


def _make_recommender():
    """Create a HybridRecommender with the vector store mocked out."""
    with patch("app.ai.hybrid_recommender.get_vector_store"):
        return HybridRecommender()


# ===========================================================================
# _calculate_dynamic_weights  (pure logic)
# ===========================================================================

class TestDynamicWeights:
    def setup_method(self):
        self.rec = _make_recommender()

    def _assert_weights_sum_to_one(self, weights):
        total = sum(weights.values())
        assert abs(total - 1.0) < 1e-6, f"Weights sum to {total}, expected 1.0"

    # Cold start: no activity, has genres
    def test_cold_start_with_genres(self):
        w = self.rec._calculate_dynamic_weights(activity_count=0, has_genres=True)
        self._assert_weights_sum_to_one(w)
        assert w["genre"] == 0.5  # genres dominate
        assert w["content"] == 0.2
        assert w["popularity"] == 0.1

    # Cold start: no activity, no genres
    def test_cold_start_no_genres(self):
        w = self.rec._calculate_dynamic_weights(activity_count=0, has_genres=False)
        self._assert_weights_sum_to_one(w)
        assert w["genre"] == 0.0  # no genres
        assert w["popularity"] == 0.7  # popularity dominates

    # Just above cold-start threshold
    def test_just_above_threshold(self):
        w = self.rec._calculate_dynamic_weights(
            activity_count=MIN_ACTIVITY_FOR_BEHAVIOR, has_genres=True
        )
        self._assert_weights_sum_to_one(w)
        # Still has some genre weight but behavior is starting to kick in
        assert w["genre"] > 0

    # Fully active user
    def test_fully_active(self):
        w = self.rec._calculate_dynamic_weights(
            activity_count=FULL_BEHAVIOR_THRESHOLD + 10, has_genres=True
        )
        self._assert_weights_sum_to_one(w)
        # Content should have gained weight over genre
        assert w["content"] > w["genre"]

    # Boundary: exactly at full threshold
    def test_at_full_threshold(self):
        w = self.rec._calculate_dynamic_weights(
            activity_count=FULL_BEHAVIOR_THRESHOLD, has_genres=True
        )
        self._assert_weights_sum_to_one(w)

    # Without genres, behavior should still produce valid weights
    def test_active_no_genres(self):
        w = self.rec._calculate_dynamic_weights(activity_count=20, has_genres=False)
        self._assert_weights_sum_to_one(w)


# ===========================================================================
# _calculate_quality_score  (near-pure — needs mock movie)
# ===========================================================================

class TestQualityScore:
    def setup_method(self):
        self.rec = _make_recommender()

    def test_high_quality_movie(self):
        movie = make_movie(tmdb_rating=9.0, average_rating=4.8, review_count=100)
        score = self.rec._calculate_quality_score(movie, favorite_count=50, max_favorites=100)
        assert 0.0 <= score <= 1.0
        assert score > 0.6  # should be high

    def test_low_quality_movie(self):
        movie = make_movie(tmdb_rating=2.0, average_rating=1.0, review_count=5)
        score = self.rec._calculate_quality_score(movie, favorite_count=0, max_favorites=100)
        assert 0.0 <= score <= 1.0
        assert score < 0.4

    def test_no_reviews_defaults_to_tmdb(self):
        movie = make_movie(tmdb_rating=7.0, average_rating=0, review_count=0)
        score = self.rec._calculate_quality_score(movie, favorite_count=0, max_favorites=1)
        # With 0 reviews, confidence=0 so community_norm falls back entirely to tmdb
        # quality = 0.4 * (7/10) + 0.3 * (7/10) + 0.3 * 0 = 0.49
        assert 0.4 <= score <= 0.6

    def test_favorites_boost(self):
        movie = make_movie(tmdb_rating=7.0, average_rating=3.5, review_count=20)
        score_no_favs = self.rec._calculate_quality_score(movie, favorite_count=0, max_favorites=100)
        score_with_favs = self.rec._calculate_quality_score(movie, favorite_count=80, max_favorites=100)
        assert score_with_favs > score_no_favs

    def test_zero_max_favorites(self):
        movie = make_movie(tmdb_rating=7.0, average_rating=3.5, review_count=10)
        # Should not crash with max_favorites=0
        score = self.rec._calculate_quality_score(movie, favorite_count=0, max_favorites=0)
        assert 0.0 <= score <= 1.0

    def test_missing_tmdb_rating(self):
        movie = make_movie(tmdb_rating=None, average_rating=4.0, review_count=50)
        score = self.rec._calculate_quality_score(movie, favorite_count=5, max_favorites=50)
        assert 0.0 <= score <= 1.0

    def test_confidence_grows_with_reviews(self):
        """More reviews → community rating has more influence."""
        movie_few = make_movie(tmdb_rating=5.0, average_rating=5.0, review_count=2)
        movie_many = make_movie(tmdb_rating=5.0, average_rating=5.0, review_count=200)
        score_few = self.rec._calculate_quality_score(movie_few, 0, 1)
        score_many = self.rec._calculate_quality_score(movie_many, 0, 1)
        # With max community rating and high confidence, score should be ≥ low confidence case
        assert score_many >= score_few - 0.01  # small tolerance for floating math


# ===========================================================================
# _get_excluded_movies  (pure logic)
# ===========================================================================

class TestExcludedMovies:
    def setup_method(self):
        self.rec = _make_recommender()

    def test_excludes_reviewed_movies(self):
        reviews = [make_review(movie_id=10), make_review(movie_id=20)]
        excluded = self.rec._get_excluded_movies(reviews, [], exclude_watched=False)
        assert 10 in excluded
        assert 20 in excluded

    def test_excludes_completed_when_flag_set(self):
        watchlist = [
            make_watchlist_entry(movie_id=30, status=WatchStatus.COMPLETED),
            make_watchlist_entry(movie_id=40, status=WatchStatus.PLANNED),
        ]
        excluded = self.rec._get_excluded_movies([], watchlist, exclude_watched=True)
        assert 30 in excluded
        assert 40 not in excluded  # PLANNED should not be excluded

    def test_excludes_dropped_and_watching(self):
        watchlist = [
            make_watchlist_entry(movie_id=50, status=WatchStatus.DROPPED),
            make_watchlist_entry(movie_id=60, status=WatchStatus.WATCHING),
        ]
        excluded = self.rec._get_excluded_movies([], watchlist, exclude_watched=True)
        assert 50 in excluded
        assert 60 in excluded

    def test_no_exclusions_when_flag_off(self):
        watchlist = [
            make_watchlist_entry(movie_id=70, status=WatchStatus.COMPLETED),
        ]
        excluded = self.rec._get_excluded_movies([], watchlist, exclude_watched=False)
        assert 70 not in excluded

    def test_empty_inputs(self):
        excluded = self.rec._get_excluded_movies([], [], exclude_watched=True)
        assert excluded == set()


# ===========================================================================
# Constants sanity checks
# ===========================================================================

class TestConstants:
    def test_watchlist_weights_cover_all_statuses(self):
        for status in WatchStatus:
            assert status in WATCHLIST_WEIGHTS

    def test_mood_genre_map_values_are_lists(self):
        for mood, genres in MOOD_GENRE_MAP.items():
            assert isinstance(genres, list)
            assert len(genres) > 0

    def test_quality_weights_sum_to_one(self):
        total = sum(QUALITY_WEIGHTS.values())
        assert abs(total - 1.0) < 1e-6

    def test_favorite_weight_positive(self):
        assert FAVORITE_WEIGHT > 0

    def test_thresholds_ordered(self):
        assert MIN_ACTIVITY_FOR_BEHAVIOR < FULL_BEHAVIOR_THRESHOLD
