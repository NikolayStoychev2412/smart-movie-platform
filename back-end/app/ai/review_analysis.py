# app/ai/review_analysis.py
"""
Review sentiment analysis and summarization using HuggingFace models.
"""
import os
import logging
from typing import Dict, List
from enum import Enum

logger = logging.getLogger(__name__)

# Lazy imports - set to None to force reload on server restart
_sentiment_pipeline = None
_loaded_model_name = None
_MODEL_VERSION = 2  # Increment this to force model reload


class SentimentLabel(str, Enum):
    """Sentiment labels"""
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"


class ReviewAnalyzer:
    """Analyze movie reviews for sentiment and key themes"""

    def __init__(self):
        """Initialize review analyzer with HuggingFace."""
        self.provider = "huggingface"
        self._init_huggingface()
        logger.info(f"Initialized ReviewAnalyzer with {self.provider}")

    def _init_huggingface(self):
        """Initialize HuggingFace sentiment pipeline"""
        global _sentiment_pipeline, _loaded_model_name

        # Use multilingual model so Bulgarian (and other languages) work correctly
        SENTIMENT_MODEL = os.getenv(
            "HF_SENTIMENT_MODEL",
            "nlptown/bert-base-multilingual-uncased-sentiment"
        )

        # Check if we need to reload (wrong model loaded or not loaded)
        needs_reload = _sentiment_pipeline is None or _loaded_model_name != SENTIMENT_MODEL

        if needs_reload:
            from transformers import pipeline
            logger.info(f"Loading sentiment model: {SENTIMENT_MODEL}")
            _sentiment_pipeline = pipeline("sentiment-analysis", model=SENTIMENT_MODEL)
            _loaded_model_name = SENTIMENT_MODEL
            logger.info(f"Loaded HuggingFace model: {SENTIMENT_MODEL}")
        else:
            logger.info(f"Using cached model: {_loaded_model_name}")

    def analyze(self, text: str) -> Dict:
        """
        Analyze review text for sentiment and summary.

        Args:
            text: Review text to analyze

        Returns:
            Dict with sentiment, confidence, summary, and keywords
        """
        if not text or len(text.strip()) < 10:
            return {
                "sentiment": SentimentLabel.NEUTRAL,
                "confidence": 0.0,
                "summary": "",
                "keywords": []
            }

        try:
            return self._analyze_hf(text)
        except Exception as e:
            logger.error(f"Error analyzing review: {e}")
            return {
                "sentiment": SentimentLabel.NEUTRAL,
                "confidence": 0.0,
                "summary": text[:100],
                "keywords": [],
                "error": str(e)
            }

    def _analyze_hf(self, text: str) -> Dict:
        """Analyze using HuggingFace model"""
        global _sentiment_pipeline

        # Get sentiment - get all labels with scores for better analysis
        try:
            results = _sentiment_pipeline(text[:512], top_k=None)
        except Exception:
            # Fallback to single result if top_k not supported
            results = [_sentiment_pipeline(text[:512])[0]]

        # Flatten results if nested
        if results and isinstance(results[0], list):
            results = results[0]
        elif isinstance(results, dict):
            results = [results]

        # Build score map
        scores = {}
        for r in results:
            if isinstance(r, dict) and "label" in r:
                label = r["label"].upper()
                scores[label] = r["score"]

        # Handle different model output formats
        if "1 STAR" in scores or "5 STARS" in scores:
            # Star rating model (nlptown multilingual) - supports Bulgarian
            star_scores = {i: scores.get(f"{i} STAR" if i == 1 else f"{i} STARS", 0) for i in range(1, 6)}
            weighted_avg = sum(i * star_scores[i] for i in range(1, 6))

            if weighted_avg >= 3.5:
                sentiment = SentimentLabel.POSITIVE
                confidence = min(0.95, 0.5 + (weighted_avg - 3.5) * 0.3)
            elif weighted_avg <= 2.5:
                sentiment = SentimentLabel.NEGATIVE
                confidence = min(0.95, 0.5 + (2.5 - weighted_avg) * 0.3)
            else:
                sentiment = SentimentLabel.NEUTRAL
                confidence = 0.6
        elif "POSITIVE" in scores or "NEGATIVE" in scores:
            # Binary/ternary model - POSITIVE/NEGATIVE/NEUTRAL
            pos_score = scores.get("POSITIVE", 0)
            neg_score = scores.get("NEGATIVE", 0)
            neu_score = scores.get("NEUTRAL", 0)

            if neu_score > pos_score and neu_score > neg_score:
                sentiment = SentimentLabel.NEUTRAL
                confidence = neu_score
            elif pos_score > neg_score:
                sentiment = SentimentLabel.POSITIVE
                confidence = pos_score
            else:
                sentiment = SentimentLabel.NEGATIVE
                confidence = neg_score
        else:
            # Fallback: LABEL_0/LABEL_1/LABEL_2 format
            label_map = {"LABEL_0": "NEGATIVE", "LABEL_1": "NEUTRAL", "LABEL_2": "POSITIVE"}
            mapped = {label_map.get(k, k): v for k, v in scores.items()}
            best_label = max(mapped, key=mapped.get)
            sentiment = SentimentLabel(best_label.lower()) if best_label.lower() in [e.value for e in SentimentLabel] else SentimentLabel.NEUTRAL
            confidence = mapped[best_label]

        # Extract keywords
        keywords = self._extract_keywords(text)

        # Generate summary
        summary = self._generate_summary(text)

        return {
            "sentiment": sentiment,
            "confidence": round(confidence, 3),
            "summary": summary,
            "keywords": keywords
        }

    def _extract_keywords(self, text: str, max_keywords: int = 5) -> List[str]:
        """Simple keyword extraction (supports English and Bulgarian)"""
        stop_words = {
            # English
            "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
            "of", "with", "is", "was", "are", "were", "this", "that", "it",
            "very", "really", "movie", "film", "watch", "watched", "see", "seen",
            "have", "has", "had", "been", "being", "would", "could", "should",
            # Bulgarian
            "филм", "филма", "филмът", "много", "беше", "като", "това",
            "тази", "този", "които", "която", "който", "което", "има", "може",
            "ще", "при", "без", "след", "преди", "между", "също", "още",
            "само", "вече", "нещо", "всичко", "защото", "когато", "обаче",
        }

        words = text.lower().split()
        word_freq = {}

        for word in words:
            word = word.strip(".,!?;:\"'()")

            if len(word) < 3 or word in stop_words or not word.isalpha():
                continue

            word_freq[word] = word_freq.get(word, 0) + 1

        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        return [word for word, _ in sorted_words[:max_keywords]]

    def _generate_summary(self, text: str, max_length: int = 100) -> str:
        """Generate a simple summary"""
        sentences = text.split('.')
        if sentences and len(sentences[0]) <= max_length:
            return sentences[0].strip() + "."

        if len(text) <= max_length:
            return text

        return text[:max_length].rsplit(' ', 1)[0] + "..."


def analyze_review(text: str) -> Dict:
    """
    Convenience function to analyze a review.

    Example:
        >>> result = analyze_review("Amazing movie, loved it!")
        >>> print(result["sentiment"])
        "positive"
    """
    analyzer = ReviewAnalyzer()
    return analyzer.analyze(text)


