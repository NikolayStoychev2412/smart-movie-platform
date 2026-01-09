# app/ai/review_analysis.py
"""
Review sentiment analysis and summarization.
Supports both local models (HuggingFace) and OpenAI.
"""
import os
import logging
from typing import Dict, List
from enum import Enum

logger = logging.getLogger(__name__)

# Lazy imports
_sentiment_pipeline = None
_openai_client = None


class SentimentLabel(str, Enum):
    """Sentiment labels"""
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"


class ReviewAnalyzer:
    """Analyze movie reviews for sentiment and key themes"""
    
    def __init__(self, provider: str = "huggingface"):
        """
        Initialize review analyzer.
        
        Args:
            provider: "huggingface" or "openai"
        """
        self.provider = provider.lower()
        
        if self.provider == "huggingface":
            self._init_huggingface()
        elif self.provider == "openai":
            self._init_openai()
        else:
            raise ValueError(f"Unknown provider: {provider}")
        
        logger.info(f"Initialized ReviewAnalyzer with {self.provider}")
    
    def _init_huggingface(self):
        """Initialize HuggingFace sentiment pipeline"""
        global _sentiment_pipeline
        
        if _sentiment_pipeline is None:
            from transformers import pipeline
            
            model_name = os.getenv("HF_SENTIMENT_MODEL", "distilbert-base-uncased-finetuned-sst-2-english")
            _sentiment_pipeline = pipeline("sentiment-analysis", model=model_name)
            logger.info(f"Loaded HuggingFace model: {model_name}")
    
    def _init_openai(self):
        """Initialize OpenAI client"""
        global _openai_client
        
        if _openai_client is None:
            import openai
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY not set")
            _openai_client = openai.OpenAI(api_key=api_key)
            logger.info("Initialized OpenAI client for review analysis")
    
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
            if self.provider == "huggingface":
                return self._analyze_hf(text)
            elif self.provider == "openai":
                return self._analyze_openai(text)
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
        
        # Get sentiment
        result = _sentiment_pipeline(text[:512])[0]
        
        # Map labels
        label_map = {
            "POSITIVE": SentimentLabel.POSITIVE,
            "NEGATIVE": SentimentLabel.NEGATIVE,
            "NEUTRAL": SentimentLabel.NEUTRAL
        }
        
        sentiment = label_map.get(result["label"].upper(), SentimentLabel.NEUTRAL)
        confidence = result["score"]
        
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
    
    def _analyze_openai(self, text: str) -> Dict:
        """Analyze using OpenAI API"""
        global _openai_client
        
        prompt = f"""Analyze this movie review and provide:
1. Sentiment (positive/negative/neutral)
2. A one-sentence summary
3. 3-5 keywords

Review: {text}

Respond in JSON format:
{{
  "sentiment": "positive|negative|neutral",
  "summary": "one sentence",
  "keywords": ["word1", "word2", ...]
}}"""
        
        response = _openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a movie review analyzer."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=150
        )
        
        import json
        result = json.loads(response.choices[0].message.content)
        
        return {
            "sentiment": SentimentLabel(result["sentiment"].lower()),
            "confidence": 0.9,
            "summary": result["summary"],
            "keywords": result["keywords"]
        }
    
    def _extract_keywords(self, text: str, max_keywords: int = 5) -> List[str]:
        """Simple keyword extraction"""
        stop_words = {
            "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
            "of", "with", "is", "was", "are", "were", "this", "that", "it",
            "very", "really", "movie", "film", "watch", "watched", "see", "seen"
        }
        
        words = text.lower().split()
        word_freq = {}
        
        for word in words:
            word = word.strip(".,!?;:\"'()")
            
            if len(word) < 4 or word in stop_words or not word.isalpha():
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


def analyze_review(text: str, provider: str = None) -> Dict:
    """
    Convenience function to analyze a review.
    
    Example:
        >>> result = analyze_review("Amazing movie, loved it!")
        >>> print(result["sentiment"])
        "positive"
    """
    if provider is None:
        provider = os.getenv("REVIEW_ANALYSIS_PROVIDER", "huggingface")
    
    analyzer = ReviewAnalyzer(provider)
    return analyzer.analyze(text)


def get_review_statistics(analyses: List[Dict]) -> Dict:
    """Get aggregate statistics from multiple review analyses"""
    if not analyses:
        return {
            "total": 0,
            "positive": 0,
            "negative": 0,
            "neutral": 0,
            "avg_confidence": 0.0,
            "common_keywords": []
        }
    
    sentiment_counts = {
        SentimentLabel.POSITIVE: 0,
        SentimentLabel.NEGATIVE: 0,
        SentimentLabel.NEUTRAL: 0
    }
    
    total_confidence = 0.0
    all_keywords = []
    
    for analysis in analyses:
        sentiment = analysis.get("sentiment", SentimentLabel.NEUTRAL)
        if isinstance(sentiment, str):
            sentiment = SentimentLabel(sentiment)
        
        sentiment_counts[sentiment] += 1
        total_confidence += analysis.get("confidence", 0.0)
        all_keywords.extend(analysis.get("keywords", []))
    
    # Count keyword frequency
    keyword_freq = {}
    for keyword in all_keywords:
        keyword_freq[keyword] = keyword_freq.get(keyword, 0) + 1
    
    common_keywords = sorted(keyword_freq.items(), key=lambda x: x[1], reverse=True)[:10]
    
    return {
        "total": len(analyses),
        "positive": sentiment_counts[SentimentLabel.POSITIVE],
        "negative": sentiment_counts[SentimentLabel.NEGATIVE],
        "neutral": sentiment_counts[SentimentLabel.NEUTRAL],
        "positive_percentage": round(sentiment_counts[SentimentLabel.POSITIVE] / len(analyses) * 100, 1),
        "avg_confidence": round(total_confidence / len(analyses), 3),
        "common_keywords": [kw for kw, _ in common_keywords]
    }