# app/ai/semantic_search.py
"""
Semantic search over movie summaries using natural language queries.
Enables users to search by meaning, not just keywords.
"""
import logging
from typing import List, Tuple, Optional, Dict
from sqlalchemy.orm import Session

from app.models.movie import Movie
from app.ai.vector_store import get_vector_store
from app.ai.embeddings import get_embedding

logger = logging.getLogger(__name__)


class SemanticSearch:
    """Semantic search engine for movies"""
    
    def __init__(self):
        self.vector_store = get_vector_store()
    
    def search(
        self,
        db: Session,
        query: str,
        top_k: int = 20,
        min_score: float = 0.0,
        filters: Optional[Dict] = None
    ) -> List[Tuple[Movie, float, str]]:
        """
        Search movies using natural language query.
        
        Args:
            db: Database session
            query: Natural language search query
            top_k: Number of results to return
            min_score: Minimum similarity score (0-1)
            filters: Optional filters (genre, year, min_rating)
            
        Returns:
            List of (Movie, similarity_score, snippet) tuples
            
        Example:
            >>> results = search(db, "dark thriller about revenge")
            >>> for movie, score, snippet in results:
            ...     print(f"{movie.title}: {score:.2f}")
        """
        # Generate query embedding
        query_vector = get_embedding(query)
        
        # Get candidate movie IDs if filters applied
        filter_movie_ids = None
        if filters:
            filter_movie_ids = self._apply_filters(db, filters)
            if not filter_movie_ids:
                return []  # No movies match filters
        
        # Search vector store
        search_results = self.vector_store.search(
            query_vector=query_vector,
            top_k=top_k * 2,  # Get more for filtering
            filter_ids=filter_movie_ids
        )
        
        # Fetch movies and create results
        results = []
        for movie_id, score in search_results:
            if score < min_score:
                continue
            
            movie = db.query(Movie).filter(Movie.id == movie_id).first()
            if not movie:
                continue
            
            # Generate snippet (first 150 chars of summary)
            snippet = self._generate_snippet(movie.summary, query)
            
            results.append((movie, score, snippet))
            
            if len(results) >= top_k:
                break
        
        return results
    
    def _apply_filters(
        self,
        db: Session,
        filters: Dict
    ) -> Optional[List[int]]:
        """
        Apply filters to get candidate movie IDs.
        
        Filters:
            - genre: str (partial match)
            - year: int
            - min_rating: float
        """
        query = db.query(Movie.id)
        
        if 'genre' in filters:
            query = query.filter(Movie.genre.ilike(f"%{filters['genre']}%"))
        
        if 'year' in filters and hasattr(Movie, 'release_year'):
            query = query.filter(Movie.release_year == filters['year'])
        
        if 'min_rating' in filters:
            query = query.filter(Movie.average_rating >= filters['min_rating'])
        
        results = query.all()
        return [row[0] for row in results] if results else None
    
    def _generate_snippet(
        self,
        summary: str,
        query: str,
        max_length: int = 150
    ) -> str:
        """
        Generate a snippet from the summary.
        Tries to include query terms if found.
        """
        if not summary:
            return ""
        
        if len(summary) <= max_length:
            return summary
        
        # Try to find query terms in summary
        query_words = query.lower().split()
        summary_lower = summary.lower()
        
        best_pos = 0
        max_matches = 0
        
        # Find position with most query word matches
        for i in range(0, len(summary) - max_length, 20):
            snippet = summary_lower[i:i+max_length]
            matches = sum(1 for word in query_words if word in snippet)
            if matches > max_matches:
                max_matches = matches
                best_pos = i
        
        # Extract snippet
        snippet = summary[best_pos:best_pos+max_length].strip()
        
        # Add ellipsis
        if best_pos > 0:
            snippet = "..." + snippet
        if best_pos + max_length < len(summary):
            snippet = snippet + "..."
        
        return snippet
    
    def search_by_mood(
        self,
        db: Session,
        mood: str,
        top_k: int = 20
    ) -> List[Tuple[Movie, float, str]]:
        """
        Search movies by mood/emotion.
        
        Args:
            mood: Emotion keyword (e.g., "uplifting", "dark", "romantic")
            top_k: Number of results
            
        Returns:
            List of (Movie, score, snippet) tuples
            
        Example:
            >>> results = search_by_mood(db, "uplifting")
        """
        # Expand mood into descriptive query
        mood_queries = {
            "uplifting": "inspiring hopeful heartwarming feel-good motivational",
            "dark": "gritty bleak disturbing intense psychological noir",
            "romantic": "love romance heartfelt passionate emotional connection",
            "funny": "comedy hilarious witty humorous laugh-out-loud",
            "scary": "horror terrifying frightening suspenseful thriller",
            "sad": "emotional tearjerker melancholic tragic heartbreaking",
            "exciting": "action-packed thrilling fast-paced adrenaline adventure",
            "thoughtful": "philosophical deep meaningful contemplative intellectual"
        }
        
        query = mood_queries.get(mood.lower(), f"{mood} movies")
        
        return self.search(db, query, top_k)


def semantic_search(
    db: Session,
    query: str,
    top_k: int = 20,
    **kwargs
) -> List[Tuple[Movie, float, str]]:
    """
    Convenience function for semantic search.
    
    Example:
        >>> results = semantic_search(
        ...     db,
        ...     "space exploration with deep themes",
        ...     top_k=10,
        ...     filters={"min_rating": 4.0}
        ... )
    """
    searcher = SemanticSearch()
    return searcher.search(db, query, top_k, **kwargs)


def search_by_mood(
    db: Session,
    mood: str,
    top_k: int = 20
) -> List[Tuple[Movie, float, str]]:
    """
    Convenience function for mood-based search.
    
    Example:
        >>> results = search_by_mood(db, "uplifting", top_k=15)
    """
    searcher = SemanticSearch()
    return searcher.search_by_mood(db, mood, top_k)