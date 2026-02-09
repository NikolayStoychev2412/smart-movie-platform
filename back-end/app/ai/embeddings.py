# app/ai/embeddings.py
"""
Embedding provider with multilingual support.

Uses paraphrase-multilingual-MiniLM-L12-v2 which understands 50+ languages
including Bulgarian - NO TRANSLATION NEEDED!

Supports: sentence-transformers (local) and OpenAI (cloud)
"""
import os
import logging
from typing import List
from functools import lru_cache

logger = logging.getLogger(__name__)

# Lazy imports to avoid loading heavy libraries if not needed
_sentence_transformer_model = None
_openai_client = None


class EmbeddingProvider:
    """Factory for creating embeddings from different providers"""
    
    def __init__(self, provider: str = "sentence-transformers"):
        """
        Initialize embedding provider.
        
        Args:
            provider: "sentence-transformers" or "openai"
        """
        self.provider = provider.lower()
        self.model_name = self._get_model_name()
        self.dimension = self._get_dimension()
        
        if self.provider == "sentence-transformers":
            self._init_sentence_transformer()
        elif self.provider == "openai":
            self._init_openai()
        else:
            raise ValueError(f"Unknown provider: {provider}")
        
        logger.info(f"Initialized {self.provider} embedding provider")
        logger.info(f"  Model: {self.model_name}")
        logger.info(f"  Dimension: {self.dimension}")
    
    def _get_model_name(self) -> str:
        """Get model name based on provider and env vars"""
        if self.provider == "sentence-transformers":
            # Default to multilingual model for Bulgarian support!
            return os.getenv("ST_MODEL_NAME", "paraphrase-multilingual-MiniLM-L12-v2")
        elif self.provider == "openai":
            return "text-embedding-ada-002"
        return "unknown"
    
    def _get_dimension(self) -> int:
        """Get embedding dimension for the provider/model"""
        if self.provider == "sentence-transformers":
            # Both models have 384 dimensions
            # - all-MiniLM-L6-v2: 384
            # - paraphrase-multilingual-MiniLM-L12-v2: 384
            return 384
        elif self.provider == "openai":
            return 1536  # text-embedding-ada-002
        return 384
    
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
    
    def _init_openai(self):
        """Initialize OpenAI client"""
        global _openai_client
        
        if _openai_client is None:
            import openai
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY not set in environment")
            _openai_client = openai.OpenAI(api_key=api_key)
            logger.info("Initialized OpenAI client")
    
    def get_embedding(self, text: str) -> List[float]:
        """
        Get embedding for a single text.
        
        Works with Bulgarian, English, or any of the 50 supported languages!
        
        Args:
            text: Input text to embed (any language)
            
        Returns:
            List of floats representing the embedding vector
        """
        if not text or not text.strip():
            return [0.0] * self.dimension
        
        try:
            if self.provider == "sentence-transformers":
                return self._get_st_embedding(text)
            elif self.provider == "openai":
                return self._get_openai_embedding(text)
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
            if self.provider == "sentence-transformers":
                return self._get_st_embeddings_batch(texts)
            elif self.provider == "openai":
                return [self._get_openai_embedding(t) for t in texts]
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
    
    def _get_openai_embedding(self, text: str) -> List[float]:
        """Get embedding using OpenAI API"""
        global _openai_client
        
        response = _openai_client.embeddings.create(
            model="text-embedding-ada-002",
            input=text
        )
        return response.data[0].embedding


# Singleton instance cache
_embedding_provider: EmbeddingProvider = None


def get_embedding_provider() -> EmbeddingProvider:
    """
    Get singleton embedding provider instance.
    Provider is determined by EMBEDDINGS_PROVIDER env var.
    """
    global _embedding_provider
    
    if _embedding_provider is None:
        provider = os.getenv("EMBEDDINGS_PROVIDER", "sentence-transformers")
        _embedding_provider = EmbeddingProvider(provider)
    
    return _embedding_provider


def get_embedding(text: str) -> List[float]:
    """
    Convenience function to get embedding for a single text.
    
    Works with any language (Bulgarian, English, etc.)!
    
    Example:
        >>> embedding = get_embedding("A sci-fi movie about space")
        >>> len(embedding)
        384
        
        >>> # Bulgarian works too!
        >>> embedding = get_embedding("Страшен филм за космоса")
        >>> len(embedding)
        384
    """
    provider = get_embedding_provider()
    return provider.get_embedding(text)


def get_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """
    Convenience function to get embeddings for multiple texts.
    
    Example:
        >>> texts = ["Movie 1 summary", "Резюме на филм 2"]  # Mixed languages OK!
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