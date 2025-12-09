# app/models/__init__.py
"""
Models package - imports all models to ensure proper SQLAlchemy initialization
"""

# Import all models so SQLAlchemy can resolve relationships
from app.models.user import User
from app.models.movie import Movie
from app.models.review import Review
from app.models.watchlist import Watchlist, WatchStatus  # ✨ NEW

# Make them available when doing: from app.models import Movie
__all__ = ["User", "Movie", "Review", "Watchlist", "WatchStatus"]