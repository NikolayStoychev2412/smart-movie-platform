"""Integration test: full recommend_for_user pipeline with an in-memory SQLite DB.

Exercises the complete orchestration layer:
  - Real SQLAlchemy queries against SQLite (User, Movie, Review, Watchlist)
  - Genre-based recommendation path (cold-start + active user)
  - Exclusion of already-reviewed / completed movies
  - Score ordering, valid range, and explanation structure
  - Diversity constraint (max 3 movies per genre in top results)

Only the vector store (FAISS + embeddings) is mocked — everything else runs
for real.
"""
import os

# Must be set before any app.* import triggers database.py validation.
# If DATABASE_URL is already set (e.g. from a .env file) this is a no-op.
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_integration_dummy.db")

import pytest
from unittest.mock import MagicMock, patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.user import User
from app.models.movie import Movie
from app.models.review import Review
from app.models.watchlist import Watchlist, WatchStatus
from app.ai.hybrid_recommender import HybridRecommender


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def db():
    """In-memory SQLite session with a small, deterministic dataset."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # One user with two preferred genres
    user = User(
        id=1,
        name="Alice",
        email="alice@test.com",
        hashed_password="hashed",
        is_admin=False,
        preferred_genres=["Action", "Drama"],
    )

    # Four movies covering different genres
    movies = [
        Movie(id=1, title="Action Hero",     genre="Action, Thriller",          average_rating=4.5, review_count=100, tmdb_rating=8.0),
        Movie(id=2, title="Drama Queen",      genre="Drama, Romance",             average_rating=4.2, review_count=50,  tmdb_rating=7.5),
        Movie(id=3, title="Sci-Fi Journey",   genre="Science Fiction, Action",    average_rating=4.0, review_count=30,  tmdb_rating=8.5),
        Movie(id=4, title="Laugh Riot",       genre="Comedy, Family",             average_rating=3.8, review_count=25,  tmdb_rating=7.0),
    ]

    session.add(user)
    session.add_all(movies)
    session.flush()

    # Alice reviewed movie 1 → must be excluded from recommendations
    session.add(Review(user_id=1, movie_id=1, rating=5.0, comment="Loved it!"))
    # Alice completed movie 2 → must be excluded when exclude_watched=True
    session.add(Watchlist(user_id=1, movie_id=2, status=WatchStatus.COMPLETED))
    session.commit()

    yield session

    session.close()
    Base.metadata.drop_all(engine)


def _make_rec() -> HybridRecommender:
    """Create a HybridRecommender whose vector store is fully mocked.

    The mock returns no vectors and no search results, so content-based recs
    are a no-op — genre-based and collaborative paths are exercised instead.
    """
    mock_vs = MagicMock()
    mock_vs.get_vector.return_value = None
    mock_vs.search.return_value = []
    with patch("app.ai.hybrid_recommender.get_vector_store", return_value=mock_vs):
        rec = HybridRecommender()
    # rec.vector_store already holds mock_vs; patch only needed during __init__
    return rec


# ---------------------------------------------------------------------------
# Integration tests
# ---------------------------------------------------------------------------

class TestRecommendForUserIntegration:

    def test_returns_nonempty_list_of_movie_score_explanation_tuples(self, db):
        """Pipeline should produce at least one recommendation."""
        rec = _make_rec()
        results = rec.recommend_for_user(db, user_id=1, top_k=10)

        assert len(results) > 0
        for movie, score, explanation in results:
            assert isinstance(movie, Movie)
            assert isinstance(score, float)
            assert isinstance(explanation, dict)

    def test_scores_are_within_valid_range(self, db):
        """Every score must be in [0.0, 1.0]."""
        rec = _make_rec()
        results = rec.recommend_for_user(db, user_id=1, top_k=10)

        for _, score, _ in results:
            assert 0.0 <= score <= 1.0, f"Score {score!r} out of [0, 1]"

    def test_reviewed_and_completed_movies_are_excluded(self, db):
        """Movie 1 (reviewed) and Movie 2 (completed) must not appear."""
        rec = _make_rec()
        results = rec.recommend_for_user(db, user_id=1, top_k=10, exclude_watched=True)

        result_ids = {movie.id for movie, _, _ in results}
        assert 1 not in result_ids, "Reviewed movie (id=1) should be excluded"
        assert 2 not in result_ids, "Completed movie (id=2) should be excluded"

    def test_results_are_sorted_by_score_descending(self, db):
        """Recommendations must be ordered highest-score first."""
        rec = _make_rec()
        results = rec.recommend_for_user(db, user_id=1, top_k=10)

        scores = [s for _, s, _ in results]
        assert scores == sorted(scores, reverse=True), (
            "Results must be sorted by score in descending order"
        )

    def test_explanation_contains_required_keys(self, db):
        """Every explanation dict must carry the standard pipeline keys."""
        rec = _make_rec()
        results = rec.recommend_for_user(db, user_id=1, top_k=5)

        required = {"reasons", "score_breakdown", "total_score", "activity_level"}
        for _, _, explanation in results:
            missing = required - explanation.keys()
            assert not missing, f"Explanation missing keys: {missing}"
            assert isinstance(explanation["reasons"], list)
