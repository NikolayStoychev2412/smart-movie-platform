"""Tests for app.ai.review_analysis — sentiment analysis and text processing."""
import pytest
from unittest.mock import patch, MagicMock

from app.ai.review_analysis import ReviewAnalyzer, SentimentLabel


# ---------------------------------------------------------------------------
# Helpers: build an analyzer WITHOUT loading the real HF model
# ---------------------------------------------------------------------------

def _make_analyzer():
    """Create a ReviewAnalyzer with the HF pipeline mocked out."""
    with patch("app.ai.review_analysis.ReviewAnalyzer._init_huggingface"):
        analyzer = ReviewAnalyzer()
    return analyzer


# ===========================================================================
# _extract_keywords  (pure function — no ML model needed)
# ===========================================================================

class TestExtractKeywords:
    def setup_method(self):
        self.analyzer = _make_analyzer()

    def test_basic_english(self):
        text = "The acting performance was incredible and the cinematography stunning"
        keywords = self.analyzer._extract_keywords(text)
        assert "acting" in keywords or "performance" in keywords
        assert "cinematography" in keywords or "incredible" in keywords

    def test_filters_english_stop_words(self):
        text = "The movie was very really good and the film was nice"
        keywords = self.analyzer._extract_keywords(text)
        # Stop words like "the", "was", "very", "really", "movie", "film" should be filtered
        for stop in ("the", "was", "very", "really", "movie", "film", "and"):
            assert stop not in keywords

    def test_filters_bulgarian_stop_words(self):
        text = "Филмът беше много добър като цяло"
        keywords = self.analyzer._extract_keywords(text)
        for stop in ("филмът", "беше", "много", "като"):
            assert stop not in keywords

    def test_respects_max_keywords(self):
        text = "alpha bravo charlie delta echo foxtrot golf hotel india"
        keywords = self.analyzer._extract_keywords(text, max_keywords=3)
        assert len(keywords) <= 3

    def test_empty_input(self):
        assert self.analyzer._extract_keywords("") == []

    def test_repeated_words_ranked_higher(self):
        text = "brilliant brilliant brilliant acting average plot"
        keywords = self.analyzer._extract_keywords(text)
        assert keywords[0] == "brilliant"

    def test_strips_punctuation(self):
        text = "Amazing! Wonderful, movie. Great; cast."
        keywords = self.analyzer._extract_keywords(text)
        # Should not contain punctuation
        for kw in keywords:
            assert kw.isalpha()

    def test_short_words_filtered(self):
        text = "it is ok so we go on up"
        keywords = self.analyzer._extract_keywords(text)
        assert keywords == []


# ===========================================================================
# _generate_summary  (pure function)
# ===========================================================================

class TestGenerateSummary:
    def setup_method(self):
        self.analyzer = _make_analyzer()

    def test_short_text_returned_as_is(self):
        text = "Great movie."
        assert self.analyzer._generate_summary(text) == "Great movie."

    def test_first_sentence_used_when_short(self):
        text = "The plot was gripping. However the ending fell flat. Overall decent."
        summary = self.analyzer._generate_summary(text)
        assert summary == "The plot was gripping."

    def test_truncation_at_word_boundary(self):
        long = "word " * 50  # 250 chars
        summary = self.analyzer._generate_summary(long, max_length=30)
        assert summary.endswith("...")
        assert len(summary) <= 35  # 30 + "..."

    def test_empty_text(self):
        # "".split('.') → [''] → first sentence '' + '.' → '.'
        assert self.analyzer._generate_summary("") == "."


# ===========================================================================
# analyze — early-return paths (no model needed)
# ===========================================================================

class TestAnalyzeEarlyReturn:
    def setup_method(self):
        self.analyzer = _make_analyzer()

    def test_empty_string(self):
        result = self.analyzer.analyze("")
        assert result["sentiment"] == SentimentLabel.NEUTRAL
        assert result["confidence"] == 0.0

    def test_short_string(self):
        result = self.analyzer.analyze("good")
        assert result["sentiment"] == SentimentLabel.NEUTRAL
        assert result["confidence"] == 0.0

    def test_whitespace_only(self):
        result = self.analyzer.analyze("         ")
        assert result["sentiment"] == SentimentLabel.NEUTRAL


# ===========================================================================
# _analyze_hf — score interpretation logic (model output mocked)
# ===========================================================================

class TestAnalyzeHfScoreInterpretation:
    def setup_method(self):
        self.analyzer = _make_analyzer()

    def _run_with_pipeline_output(self, pipeline_output):
        """Patch the global pipeline and call _analyze_hf."""
        with patch("app.ai.review_analysis._sentiment_pipeline") as mock_pipe:
            mock_pipe.side_effect = lambda text, **kw: pipeline_output
            return self.analyzer._analyze_hf("Test review text for analysis")

    # Star-rating model (nlptown/bert-base-multilingual)
    def test_star_model_positive(self):
        """5-star model with mostly 5-star probability → positive."""
        result = self._run_with_pipeline_output([
            {"label": "1 star", "score": 0.01},
            {"label": "2 stars", "score": 0.02},
            {"label": "3 stars", "score": 0.07},
            {"label": "4 stars", "score": 0.30},
            {"label": "5 stars", "score": 0.60},
        ])
        assert result["sentiment"] == SentimentLabel.POSITIVE
        assert result["confidence"] > 0.5

    def test_star_model_negative(self):
        """5-star model with mostly 1-star probability → negative."""
        result = self._run_with_pipeline_output([
            {"label": "1 star", "score": 0.60},
            {"label": "2 stars", "score": 0.25},
            {"label": "3 stars", "score": 0.10},
            {"label": "4 stars", "score": 0.03},
            {"label": "5 stars", "score": 0.02},
        ])
        assert result["sentiment"] == SentimentLabel.NEGATIVE

    def test_star_model_neutral(self):
        """5-star model with weight near 3.0 → neutral."""
        result = self._run_with_pipeline_output([
            {"label": "1 star", "score": 0.10},
            {"label": "2 stars", "score": 0.15},
            {"label": "3 stars", "score": 0.50},
            {"label": "4 stars", "score": 0.15},
            {"label": "5 stars", "score": 0.10},
        ])
        assert result["sentiment"] == SentimentLabel.NEUTRAL

    # Binary POSITIVE / NEGATIVE model
    def test_binary_model_positive(self):
        result = self._run_with_pipeline_output([
            {"label": "POSITIVE", "score": 0.92},
            {"label": "NEGATIVE", "score": 0.08},
        ])
        assert result["sentiment"] == SentimentLabel.POSITIVE
        assert result["confidence"] == pytest.approx(0.92, abs=0.01)

    def test_binary_model_negative(self):
        result = self._run_with_pipeline_output([
            {"label": "POSITIVE", "score": 0.15},
            {"label": "NEGATIVE", "score": 0.85},
        ])
        assert result["sentiment"] == SentimentLabel.NEGATIVE

    # LABEL_0 / LABEL_1 / LABEL_2 fallback format
    def test_label_fallback_positive(self):
        result = self._run_with_pipeline_output([
            {"label": "LABEL_0", "score": 0.05},
            {"label": "LABEL_1", "score": 0.10},
            {"label": "LABEL_2", "score": 0.85},
        ])
        assert result["sentiment"] == SentimentLabel.POSITIVE

    def test_label_fallback_negative(self):
        result = self._run_with_pipeline_output([
            {"label": "LABEL_0", "score": 0.80},
            {"label": "LABEL_1", "score": 0.15},
            {"label": "LABEL_2", "score": 0.05},
        ])
        assert result["sentiment"] == SentimentLabel.NEGATIVE

    # Keywords and summary are always present
    def test_result_contains_keywords_and_summary(self):
        result = self._run_with_pipeline_output([
            {"label": "POSITIVE", "score": 0.90},
            {"label": "NEGATIVE", "score": 0.10},
        ])
        assert "keywords" in result
        assert "summary" in result
        assert isinstance(result["keywords"], list)

    # Confidence is capped at 0.95 for star model
    def test_star_confidence_capped(self):
        result = self._run_with_pipeline_output([
            {"label": "1 star", "score": 0.00},
            {"label": "2 stars", "score": 0.00},
            {"label": "3 stars", "score": 0.00},
            {"label": "4 stars", "score": 0.00},
            {"label": "5 stars", "score": 1.00},
        ])
        assert result["confidence"] <= 0.95


# ===========================================================================
# SentimentLabel enum
# ===========================================================================

class TestSentimentLabel:
    def test_values(self):
        assert SentimentLabel.POSITIVE == "positive"
        assert SentimentLabel.NEGATIVE == "negative"
        assert SentimentLabel.NEUTRAL == "neutral"

    def test_from_string(self):
        assert SentimentLabel("positive") == SentimentLabel.POSITIVE
