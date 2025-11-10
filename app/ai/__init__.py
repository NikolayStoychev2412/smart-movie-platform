# app/ai/__init__.py
"""
AI-powered features for movie recommendations and search.

Modules:
- embeddings: Text embedding generation
- vector_store: FAISS-based similarity search
- hybrid_recommender: Personalized recommendations
- semantic_search: Natural language movie search
- review_analysis: Sentiment analysis and insights
"""

from app.ai.embeddings import get_embedding, get_embeddings_batch
from app.ai.hybrid_recommender import recommend_for_user, find_similar_movies
from app.ai.semantic_search import semantic_search, search_by_mood
from app.ai.review_analysis import analyze_review

__all__ = [
    "get_embedding",
    "get_embeddings_batch",
    "recommend_for_user",
    "find_similar_movies",
    "semantic_search",
    "search_by_mood",
    "analyze_review",
]