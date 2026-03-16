# app/ai/semantic_search.py
"""
Semantic search over movie summaries using natural language queries.

Uses paraphrase-multilingual-MiniLM-L12-v2 which understands 50+ languages.
Users can search in Bulgarian, English, or any supported language.
"""
import logging
from typing import List, Tuple, Optional, Dict
from sqlalchemy.orm import Session

from app.models.movie import Movie
from app.ai.vector_store import get_vector_store
from app.ai.embeddings import get_embedding

logger = logging.getLogger(__name__)


class SemanticSearch:
    """Semantic search engine for movies - supports Bulgarian and English queries"""
    
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
        
        Works with Bulgarian, English, or mixed queries.
        No translation needed - multilingual model handles it.
        
        Args:
            db: Database session
            query: Natural language search query (any language)
            top_k: Number of results to return
            min_score: Minimum similarity score (0-1)
            filters: Optional filters (genre, year, min_rating)
            
        Returns:
            List of (Movie, similarity_score, snippet) tuples
        """
        # Expand short queries with synonyms (helps with single-word searches)
        expanded_query = self._expand_query(query)
        
        # Generate query embedding
        query_vector = get_embedding(expanded_query)
        
        # Apply filters if provided
        filter_movie_ids = None
        if filters:
            filter_movie_ids = self._apply_filters(db, filters)
            if filter_movie_ids is not None and len(filter_movie_ids) == 0:
                return []
        
        # Search with extra candidates for filtering
        search_limit = max(top_k * 3, 50)
        
        # Search vector store
        search_results = self.vector_store.search(
            query_vector=query_vector,
            top_k=search_limit,
            filter_ids=filter_movie_ids
        )
        
        if not search_results:
            logger.warning(f"No results for query: '{query}'")
            return []
        
        # Adaptive threshold if not specified
        if min_score <= 0.0 and search_results:
            top_score = search_results[0][1]
            min_score = max(0.15, top_score * 0.5)
        
        # Fetch movies and create results
        results = []
        seen_ids = set()
        
        for movie_id, score in search_results:
            if movie_id in seen_ids:
                continue
            seen_ids.add(movie_id)
            
            if score < min_score:
                continue
            
            movie = db.query(Movie).filter(Movie.id == movie_id).first()
            if not movie:
                continue
            
            # Generate snippet from summary
            snippet = self._generate_snippet(movie.summary, query)
            
            results.append((movie, score, snippet))
            
            if len(results) >= top_k:
                break
        
        return results
    
    def _expand_query(self, query: str) -> str:
        """
        Expand short queries with synonyms for better matching.
        Supports both English and Bulgarian keywords.
        """
        query_lower = query.lower().strip()
        words = query_lower.split()
        
        # Don't expand if already has multiple words
        if len(words) >= 3:
            return query
        
        # Expansions for common search terms (both languages)
        expansions = {
            # English
            "horror": "horror scary frightening terrifying",
            "comedy": "comedy funny hilarious humorous",
            "action": "action adventure exciting explosive",
            "drama": "drama emotional dramatic serious",
            "romance": "romance romantic love relationship",
            "thriller": "thriller suspense tense gripping",
            "sci-fi": "science fiction futuristic space",
            "fantasy": "fantasy magical mythical epic",
            "scary": "scary horror frightening terrifying",
            "funny": "funny comedy hilarious amusing",
            "sad": "sad emotional tearjerker dramatic",
            
            # Bulgarian
            "хорър": "хорър страшен ужас",
            "комедия": "комедия смешен забавен",
            "екшън": "екшън приключение",
            "драма": "драма емоционален драматичен",
            "романтика": "романтика любов романтичен",
            "страшен": "страшен ужас хорър",
            "смешен": "смешен комедия забавен",
            "тъжен": "тъжен емоционален драматичен",
        }
        
        # Check for matches
        for keyword, expansion in expansions.items():
            if keyword in query_lower:
                return f"{query} {expansion}"
        
        return query
    
    def _apply_filters(self, db: Session, filters: Dict) -> Optional[List[int]]:
        """Apply filters to get candidate movie IDs"""
        query = db.query(Movie.id)
        
        if 'genre' in filters:
            query = query.filter(Movie.genre.ilike(f"%{filters['genre']}%"))
        
        if 'year' in filters and hasattr(Movie, 'release_year'):
            query = query.filter(Movie.release_year == filters['year'])
        
        if 'min_rating' in filters:
            query = query.filter(Movie.average_rating >= filters['min_rating'])
        
        results = query.all()
        movie_ids = [row[0] for row in results] if results else []
        
        return movie_ids if movie_ids else ([] if filters else None)
    
    def _generate_snippet(self, summary: str, query: str, max_length: int = 150) -> str:
        """Generate a relevant snippet from the summary"""
        if not summary:
            return ""
        
        if len(summary) <= max_length:
            return summary
        
        # Try to find query terms in summary
        query_words = [w.lower() for w in query.split() if len(w) > 3]
        summary_lower = summary.lower()
        
        best_pos = 0
        max_matches = 0
        
        step_size = max(20, max_length // 4)
        for i in range(0, max(1, len(summary) - max_length), step_size):
            snippet = summary_lower[i:i+max_length]
            matches = sum(1 for word in query_words if word in snippet)
            if matches > max_matches:
                max_matches = matches
                best_pos = i
        
        snippet = summary[best_pos:best_pos+max_length].strip()
        
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
        Supports Bulgarian and English mood words.
        """
        # Mood expansions
        mood_queries = {
            # English moods
            "uplifting": "inspiring hopeful heartwarming feel-good positive",
            "dark": "dark gritty bleak disturbing intense",
            "romantic": "romantic love passionate relationship heartfelt",
            "funny": "funny hilarious comedy amusing entertaining",
            "scary": "scary horror frightening terrifying creepy",
            "sad": "sad emotional tearjerker melancholic heartbreaking",
            "exciting": "exciting thrilling action-packed intense adventure",
            "thoughtful": "thoughtful philosophical deep meaningful",
            
            # Bulgarian moods
            "весел": "весел щастлив позитивен радостен",
            "тъмен": "тъмен мрачен депресиращ",
            "романтичен": "романтичен любовен страстен",
            "смешен": "смешен забавен комедия",
            "страшен": "страшен ужасяващ хорър",
            "тъжен": "тъжен емоционален драматичен",
        }
        
        # Get expanded query or use mood directly
        mood_lower = mood.lower()
        query = mood_queries.get(mood_lower, f"{mood} feeling emotional atmosphere")
        
        
        return self.search(db, query, top_k, min_score=0.0)


def semantic_search(
    db: Session,
    query: str,
    top_k: int = 20,
    **kwargs
) -> List[Tuple[Movie, float, str]]:
    """
    Search movies with natural language query.
    
    Works with Bulgarian, English, or any of 50+ supported languages.
    
    Examples:
        >>> results = semantic_search(db, "scary space movies", top_k=10)
        >>> results = semantic_search(db, "страшни филми за космос", top_k=10)
        >>> results = semantic_search(db, "романтична комедия", top_k=10)
    """
    searcher = SemanticSearch()
    return searcher.search(db, query, top_k, **kwargs)


def search_by_mood(
    db: Session,
    mood: str,
    top_k: int = 20
) -> List[Tuple[Movie, float, str]]:
    """
    Search movies by mood.
    
    Examples:
        >>> results = search_by_mood(db, "uplifting", top_k=15)
        >>> results = search_by_mood(db, "тъжен", top_k=15)  # Bulgarian "sad"
    """
    searcher = SemanticSearch()
    return searcher.search_by_mood(db, mood, top_k)