"""Shared fixtures for AI module tests."""
import pytest
from unittest.mock import MagicMock
from types import SimpleNamespace
from datetime import datetime


# ---------------------------------------------------------------------------
# Lightweight stand-ins for SQLAlchemy models (no DB required)
# ---------------------------------------------------------------------------

def make_movie(**overrides):
    """Create a lightweight Movie-like object for testing."""
    defaults = {
        "id": 1,
        "title": "Test Movie",
        "title_bg": "Тестов Филм",
        "genre": "Action, Drama",
        "genre_bg": "Екшън, Драма",
        "summary": "A test movie summary for unit testing purposes.",
        "summary_bg": "Резюме на тестов филм.",
        "average_rating": 4.0,
        "review_count": 10,
        "tmdb_rating": 7.5,
        "release_year": 2023,
        "popularity": 50.0,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def make_review(**overrides):
    """Create a lightweight Review-like object."""
    defaults = {
        "id": 1,
        "movie_id": 1,
        "user_id": 1,
        "rating": 4.0,
        "comment": "Great movie!",
        "created_at": datetime(2024, 1, 1),
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def make_watchlist_entry(**overrides):
    """Create a lightweight Watchlist-like object."""
    from app.models.watchlist import WatchStatus

    defaults = {
        "id": 1,
        "movie_id": 1,
        "user_id": 1,
        "status": WatchStatus.COMPLETED,
        "created_at": datetime(2024, 1, 1),
        "updated_at": datetime(2024, 1, 2),
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def make_favorite(**overrides):
    """Create a lightweight Favorite-like object."""
    defaults = {
        "id": 1,
        "movie_id": 1,
        "user_id": 1,
        "created_at": datetime(2024, 1, 1),
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)
