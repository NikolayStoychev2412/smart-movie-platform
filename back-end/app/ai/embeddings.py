# app/ai/embeddings.py
"""
Embedding provider with multilingual support.

Uses paraphrase-multilingual-MiniLM-L12-v2 which understands 50+ languages
including Bulgarian.
"""
import os
import logging
from typing import List
from functools import lru_cache

logger = logging.getLogger(__name__)

# Lazy import to avoid loading heavy library if not needed
_sentence_transformer_model = None


class EmbeddingProvider:
    """Embedding provider using sentence-transformers"""

    def __init__(self):
        self.provider = "sentence-transformers"
        self.model_name = os.getenv("ST_MODEL_NAME", "paraphrase-multilingual-MiniLM-L12-v2")
        # Both models have 384 dimensions
        # - all-MiniLM-L6-v2: 384
        # - paraphrase-multilingual-MiniLM-L12-v2: 384
        self.dimension = 384
        self._init_sentence_transformer()

        logger.info(f"Initialized {self.provider} embedding provider")
        logger.info(f"  Model: {self.model_name}")
        logger.info(f"  Dimension: {self.dimension}")

    def _init_sentence_transformer(self):
        """Initialize sentence-transformers model"""
        global _sentence_transformer_model

        if _sentence_transformer_model is None:
            from sentence_transformers import SentenceTransformer
            _sentence_transformer_model = SentenceTransformer(self.model_name)
            logger.info(f"Loaded sentence-transformer model: {self.model_name}")

            # Log language support info
            if "multilingual" in self.model_name.lower():
                logger.info("Multilingual model loaded - supports Bulgarian, English, and 48 other languages")

    def get_embedding(self, text: str) -> List[float]:
        """
        Get embedding for a single text.

        Args:
            text: Input text to embed (any language)

        Returns:
            List of floats representing the embedding vector
        """
        if not text or not text.strip():
            return [0.0] * self.dimension

        try:
            return self._get_st_embedding(text)
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            return [0.0] * self.dimension

    def get_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Get embeddings for multiple texts efficiently.

        Args:
            texts: List of texts to embed (any language)

        Returns:
            List of embedding vectors
        """
        if not texts:
            return []

        try:
            return self._get_st_embeddings_batch(texts)
        except Exception as e:
            logger.error(f"Error generating batch embeddings: {e}")
            return [[0.0] * self.dimension for _ in texts]

    def _get_st_embedding(self, text: str) -> List[float]:
        """Get embedding using sentence-transformers"""
        global _sentence_transformer_model
        embedding = _sentence_transformer_model.encode(text, convert_to_numpy=True)
        return embedding.tolist()

    def _get_st_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Get batch embeddings using sentence-transformers"""
        global _sentence_transformer_model
        embeddings = _sentence_transformer_model.encode(
            texts,
            convert_to_numpy=True,
            show_progress_bar=len(texts) > 10
        )
        return embeddings.tolist()


# Singleton instance cache
_embedding_provider: EmbeddingProvider = None


def get_embedding_provider() -> EmbeddingProvider:
    """Get singleton embedding provider instance."""
    global _embedding_provider

    if _embedding_provider is None:
        _embedding_provider = EmbeddingProvider()

    return _embedding_provider


def get_embedding(text: str) -> List[float]:
    """
    Convenience function to get embedding for a single text.

    Example:
        >>> embedding = get_embedding("A sci-fi movie about space")
        >>> len(embedding)
        384
    """
    provider = get_embedding_provider()
    return provider.get_embedding(text)


def get_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """
    Convenience function to get embeddings for multiple texts.

    Example:
        >>> texts = ["Movie 1 summary", "Резюме на филм 2"]
        >>> embeddings = get_embeddings_batch(texts)
        >>> len(embeddings)
        2
    """
    provider = get_embedding_provider()
    return provider.get_embeddings_batch(texts)


def get_model_info() -> dict:
    """Get information about the current embedding model"""
    provider = get_embedding_provider()
    return {
        "provider": provider.provider,
        "model_name": provider.model_name,
        "dimension": provider.dimension,
        "multilingual": "multilingual" in provider.model_name.lower(),
        "supported_languages": "50+ languages including Bulgarian, English, Russian, etc."
            if "multilingual" in provider.model_name.lower()
            else "English primarily"
    }
