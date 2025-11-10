# app/ai/embeddings.py
"""
Embedding provider with support for multiple backends.
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
        self.dimension = self._get_dimension()
        
        if self.provider == "sentence-transformers":
            self._init_sentence_transformer()
        elif self.provider == "openai":
            self._init_openai()
        else:
            raise ValueError(f"Unknown provider: {provider}")
        
        logger.info(f"Initialized {self.provider} embedding provider (dim={self.dimension})")
    
    def _get_dimension(self) -> int:
        """Get embedding dimension for the provider"""
        if self.provider == "sentence-transformers":
            return 384  # all-MiniLM-L6-v2
        elif self.provider == "openai":
            return 1536  # text-embedding-ada-002
        return 384
    
    def _init_sentence_transformer(self):
        """Initialize sentence-transformers model"""
        global _sentence_transformer_model
        
        if _sentence_transformer_model is None:
            from sentence_transformers import SentenceTransformer
            model_name = os.getenv("ST_MODEL_NAME", "all-MiniLM-L6-v2")
            _sentence_transformer_model = SentenceTransformer(model_name)
            logger.info(f"Loaded sentence-transformer model: {model_name}")
    
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
        
        Args:
            text: Input text to embed
            
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
            texts: List of texts to embed
            
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


@lru_cache(maxsize=1)
def get_embedding_provider() -> EmbeddingProvider:
    """
    Get singleton embedding provider instance.
    Provider is determined by EMBEDDINGS_PROVIDER env var.
    """
    provider = os.getenv("EMBEDDINGS_PROVIDER", "sentence-transformers")
    return EmbeddingProvider(provider)


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
        >>> texts = ["Movie 1 summary", "Movie 2 summary"]
        >>> embeddings = get_embeddings_batch(texts)
        >>> len(embeddings)
        2
    """
    provider = get_embedding_provider()
    return provider.get_embeddings_batch(texts)