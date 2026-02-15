"""Tests for app.ai.semantic_search — query expansion and snippet generation."""
import pytest
from unittest.mock import patch, MagicMock

from app.ai.semantic_search import SemanticSearch


def _make_searcher():
    """Create a SemanticSearch instance with vector store mocked out."""
    with patch("app.ai.semantic_search.get_vector_store"):
        return SemanticSearch()


# ===========================================================================
# _expand_query  (pure function)
# ===========================================================================

class TestExpandQuery:
    def setup_method(self):
        self.searcher = _make_searcher()

    def test_short_horror_query_expanded(self):
        result = self.searcher._expand_query("horror")
        assert "scary" in result
        assert "horror" in result

    def test_short_comedy_query_expanded(self):
        result = self.searcher._expand_query("comedy")
        assert "funny" in result

    def test_long_query_not_expanded(self):
        query = "scary movies about ghosts in space"
        assert self.searcher._expand_query(query) == query

    def test_bulgarian_expansion(self):
        result = self.searcher._expand_query("хорър")
        assert "страшен" in result

    def test_unknown_word_not_expanded(self):
        query = "xyzzy"
        assert self.searcher._expand_query(query) == query

    def test_two_word_query_can_be_expanded(self):
        result = self.searcher._expand_query("funny movie")
        assert "comedy" in result or "hilarious" in result

    def test_three_word_query_not_expanded(self):
        query = "good horror movie"
        assert self.searcher._expand_query(query) == query

    def test_expansion_is_case_insensitive(self):
        result = self.searcher._expand_query("Horror")
        assert "scary" in result


# ===========================================================================
# _generate_snippet  (pure function)
# ===========================================================================

class TestGenerateSnippet:
    def setup_method(self):
        self.searcher = _make_searcher()

    def test_short_summary_returned_whole(self):
        assert self.searcher._generate_snippet("Short text.", "test") == "Short text."

    def test_long_summary_truncated(self):
        long_text = "word " * 100  # 500 chars
        snippet = self.searcher._generate_snippet(long_text, "word", max_length=50)
        assert len(snippet) < 70  # 50 + ellipsis allowance

    def test_empty_summary(self):
        assert self.searcher._generate_snippet("", "test") == ""

    def test_query_term_in_snippet(self):
        text = ("A " * 80) + "magic dragon " + ("B " * 80)
        snippet = self.searcher._generate_snippet(text, "magic dragon", max_length=100)
        # The snippet should try to center around the query terms
        assert "magic" in snippet.lower() or snippet.startswith("...")

    def test_ellipsis_prefix_when_offset(self):
        text = "A " * 200
        snippet = self.searcher._generate_snippet(text, "nonexistent", max_length=30)
        # When trimmed at end, should have trailing ellipsis
        assert snippet.endswith("...")

    def test_exact_length_no_ellipsis(self):
        text = "Hello world"
        snippet = self.searcher._generate_snippet(text, "hello", max_length=150)
        assert snippet == "Hello world"


# ===========================================================================
# search_by_mood — mood query mapping (pure logic, search mocked)
# ===========================================================================

class TestSearchByMood:
    def setup_method(self):
        self.searcher = _make_searcher()

    def test_known_english_mood_maps_correctly(self):
        """Verify known moods produce expanded query strings."""
        with patch.object(self.searcher, "search", return_value=[]) as mock_search:
            self.searcher.search_by_mood(MagicMock(), "scary", top_k=5)
            call_query = mock_search.call_args[0][1]
            assert "horror" in call_query
            assert "frightening" in call_query

    def test_known_bulgarian_mood(self):
        with patch.object(self.searcher, "search", return_value=[]) as mock_search:
            self.searcher.search_by_mood(MagicMock(), "тъжен", top_k=5)
            call_query = mock_search.call_args[0][1]
            assert "емоционален" in call_query

    def test_unknown_mood_uses_fallback(self):
        with patch.object(self.searcher, "search", return_value=[]) as mock_search:
            self.searcher.search_by_mood(MagicMock(), "bizarre", top_k=5)
            call_query = mock_search.call_args[0][1]
            assert "bizarre" in call_query
