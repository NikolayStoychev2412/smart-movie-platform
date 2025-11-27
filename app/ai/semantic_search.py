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
        """
        # 🔥 NEW: Expand single-word queries into descriptive phrases
        expanded_query = self._expand_query(query)
        if expanded_query != query:
            logger.info(f"Expanded query: '{query}' → '{expanded_query}'")
        
        # Generate query embedding
        query_vector = get_embedding(expanded_query)
        
        # Get candidate movie IDs if filters applied
        filter_movie_ids = None
        if filters:
            filter_movie_ids = self._apply_filters(db, filters)
            if filter_movie_ids is not None and len(filter_movie_ids) == 0:
                logger.info(f"No movies match filters: {filters}")
                return []  # No movies match filters
        
        # 🔥 IMPROVED: Get more results to account for filtering
        # Multiply by 3 to ensure we have enough after filtering
        search_limit = max(top_k * 3, 50)
        
        # Search vector store
        search_results = self.vector_store.search(
            query_vector=query_vector,
            top_k=search_limit,
            filter_ids=filter_movie_ids
        )
        
        logger.info(f"Vector search returned {len(search_results)} results for query: '{query}'")
        
        if not search_results:
            logger.warning(f"No vector search results for query: '{query}'")
            return []
        
        # Log score distribution
        scores = [score for _, score in search_results]
        logger.info(f"Score range: {min(scores):.3f} - {max(scores):.3f}, avg: {sum(scores)/len(scores):.3f}")
        
        # 🔥 IMPROVED: Adaptive threshold with lower minimum
        # If min_score is 0.0 (default), use a smart threshold
        if min_score <= 0.0:
            if search_results:
                top_score = search_results[0][1]
                # Use 50% of top score (was 60%, now more lenient)
                # But ensure minimum threshold of 0.15 to filter truly irrelevant results
                adaptive_threshold = max(0.15, top_score * 0.5)
                min_score = adaptive_threshold
                logger.info(f"Using adaptive threshold: {min_score:.3f} (50% of top score {top_score:.3f})")
        
        # Fetch movies and create results
        results = []
        seen_ids = set()
        
        for movie_id, score in search_results:
            # Skip duplicates
            if movie_id in seen_ids:
                continue
            seen_ids.add(movie_id)
            
            # Apply threshold
            if score < min_score:
                logger.debug(f"Skipping movie {movie_id}: score {score:.3f} < threshold {min_score:.3f}")
                continue
            
            # Fetch movie
            movie = db.query(Movie).filter(Movie.id == movie_id).first()
            if not movie:
                logger.warning(f"Movie {movie_id} not found in database")
                continue
            
            # Generate snippet
            snippet = self._generate_snippet(movie.summary, query)
            
            results.append((movie, score, snippet))
            
            # Stop when we have enough results
            if len(results) >= top_k:
                break
        
        logger.info(f"Returning {len(results)} results after filtering")
        return results
    
    def _expand_query(self, query: str) -> str:
        """
        Expand single-word or short queries into descriptive phrases.
        This dramatically improves semantic search for keywords.
        
        Examples:
            "horror" → "horror scary frightening terrifying suspenseful thriller"
            "romance" → "romantic love story relationship emotional heartfelt"
        """
        # Clean query
        query_lower = query.lower().strip()
        words = query_lower.split()
        
        # If query is already 3+ words, don't expand
        if len(words) >= 3:
            return query
        
        # Genre/keyword expansions
        expansions = {
            # Genres
            "horror": "horror scary frightening terrifying suspenseful thriller dark eerie creepy",
            "thriller": "thriller suspenseful tense gripping intense mystery crime psychological",
            "action": "action adventure explosive dynamic fast-paced exciting thrilling combat fighting",
            "comedy": "comedy funny hilarious humorous witty entertaining lighthearted amusing",
            "drama": "drama emotional compelling serious character-driven moving powerful realistic",
            "romance": "romantic love story relationship emotional heartfelt passionate tender affection",
            "sci-fi": "science fiction futuristic technology space aliens advanced dystopian speculative",
            "scifi": "science fiction futuristic technology space aliens advanced dystopian speculative",
            "fantasy": "fantasy magical mythical epic adventure enchanted supernatural mystical",
            "documentary": "documentary informative educational real-life factual investigation true story",
            "western": "western cowboy frontier wild west gunslinger outlaw desert frontier",
            "war": "war military combat battle soldier conflict battlefield heroic violence",
            "crime": "crime detective investigation murder mystery police noir criminal underworld",
            "mystery": "mystery suspenseful puzzling enigmatic detective investigation whodunit secretive",
            "animation": "animated cartoon family colorful imaginative visual adventure children",
            "musical": "musical songs dancing performance choreography theatrical entertaining music",
            
            # Moods/themes
            "scary": "scary frightening terrifying horror suspenseful creepy eerie chilling",
            "funny": "funny comedy hilarious humorous witty amusing entertaining lighthearted",
            "sad": "sad emotional tearjerker melancholic tragic heartbreaking sorrowful moving",
            "dark": "dark gritty bleak disturbing intense psychological noir brooding sinister",
            "uplifting": "uplifting inspiring hopeful heartwarming feel-good motivational optimistic",
            "exciting": "exciting thrilling action-packed fast-paced adrenaline intense dynamic",
            "emotional": "emotional moving touching heartfelt powerful dramatic poignant compelling",
            "suspenseful": "suspenseful tense gripping thriller mysterious edge-of-seat nail-biting",
            "violent": "violent brutal graphic intense action combat fighting aggressive bloody",
            "romantic": "romantic love relationship passionate emotional tender heartfelt affectionate",
            
            # Common themes
            "space": "space science fiction astronaut galaxy cosmic universe planets exploration",
            "war": "war military combat battle soldier conflict battlefield heroic sacrifice",
            "love": "love romance relationship emotional passionate heartfelt tender affectionate",
            "family": "family children parents relationships heartwarming wholesome togetherness",
            "revenge": "revenge vengeance retribution justice payback dark intense psychological",
            "hero": "hero heroic protagonist brave courageous champion savior adventure",
            "villain": "villain antagonist evil criminal mastermind dark threatening menacing",
            "zombie": "zombie undead horror apocalypse survival infected outbreak terror",
            "vampire": "vampire supernatural horror dark immortal blood gothic mystery",
            "superhero": "superhero powers marvel dc action adventure comic heroic",
            "alien": "alien extraterrestrial science fiction space invasion mysterious unknown",
            "magic": "magic magical fantasy supernatural enchanted mystical sorcery powers",
            "monster": "monster creature horror frightening threatening beast terror survival",
            "heist": "heist robbery crime clever planning tension suspenseful criminal clever",
            "detective": "detective investigation mystery crime solving clues police noir thriller",
        }
        
        # Check for exact matches
        if query_lower in expansions:
            return expansions[query_lower]
        
        # Check if query is 1-2 words and contains a keyword
        if len(words) <= 2:
            for keyword, expansion in expansions.items():
                if keyword in query_lower:
                    # Combine original query with expansion
                    return f"{query} {expansion}"
        
        # Return original query if no expansion found
        return query
    
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
        movie_ids = [row[0] for row in results] if results else []
        
        logger.info(f"Filters {filters} matched {len(movie_ids)} movies")
        
        # Return None if no filters applied, empty list if filters matched nothing
        return movie_ids if movie_ids else ([] if filters else None)
    
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
        query_words = [w.lower() for w in query.split() if len(w) > 3]
        summary_lower = summary.lower()
        
        best_pos = 0
        max_matches = 0
        
        # Find position with most query word matches
        step_size = max(20, max_length // 4)
        for i in range(0, max(1, len(summary) - max_length), step_size):
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
        """
        # 🔥 IMPROVED: Expanded mood queries with better descriptions
        mood_queries = {
            "uplifting": "inspiring hopeful heartwarming feel-good motivational uplifting positive optimistic triumph",
            "dark": "gritty bleak disturbing intense psychological noir dark brooding sinister ominous",
            "romantic": "love romance heartfelt passionate emotional connection relationship tender affectionate",
            "funny": "comedy hilarious witty humorous laugh-out-loud amusing entertaining lighthearted",
            "scary": "horror terrifying frightening suspenseful thriller creepy eerie haunting chilling",
            "sad": "emotional tearjerker melancholic tragic heartbreaking sorrowful moving poignant",
            "exciting": "action-packed thrilling fast-paced adrenaline adventure intense explosive dynamic",
            "thoughtful": "philosophical deep meaningful contemplative intellectual thought-provoking introspective",
            "mysterious": "enigmatic puzzling cryptic suspenseful intriguing secretive mysterious",
            "epic": "grand sweeping epic magnificent spectacular ambitious monumental",
            "intimate": "personal close intimate emotional character-driven quiet subtle",
            "violent": "brutal violent graphic intense action combat fighting aggressive"
        }
        
        # Get expanded query or use the mood directly
        query = mood_queries.get(mood.lower(), f"{mood} emotional tone atmosphere feeling")
        
        logger.info(f"Mood search: '{mood}' -> query: '{query}'")
        
        # Use lower min_score for mood searches since they're more abstract
        return self.search(db, query, top_k, min_score=0.0)


# Convenience functions
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