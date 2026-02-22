"""Tests for app.ai.embeddings — embedding provider edge cases."""
import pytest
from unittest.mock import patch, MagicMock
import numpy as np

from app.ai.embeddings import EmbeddingProvider


def _make_provider(dimension=384):
    """Create an EmbeddingProvider with the ST model mocked out."""
    with patch("app.ai.embeddings.EmbeddingProvider._init_sentence_transformer"):
        provider = EmbeddingProvider()
        provider.dimension = dimension
    return provider


# ===========================================================================
# get_embedding — edge cases
# ===========================================================================

class TestGetEmbedding:
    def setup_method(self):
        self.provider = _make_provider()

    def test_empty_string_returns_zero_vector(self):
        result = self.provider.get_embedding("")
        assert result == [0.0] * 384

    def test_whitespace_only_returns_zero_vector(self):
        result = self.provider.get_embedding("   ")
        assert result == [0.0] * 384

    def test_none_returns_zero_vector(self):
        result = self.provider.get_embedding(None)
        assert result == [0.0] * 384

    def test_valid_text_calls_st(self):
        fake_embedding = np.random.rand(384).astype(np.float32)
        with patch("app.ai.embeddings._sentence_transformer_model") as mock_model:
            mock_model.encode.return_value = fake_embedding
            result = self.provider.get_embedding("A great action movie")
        assert len(result) == 384
        assert result == fake_embedding.tolist()

    def test_model_error_returns_zero_vector(self):
        with patch("app.ai.embeddings._sentence_transformer_model") as mock_model:
            mock_model.encode.side_effect = RuntimeError("model crash")
            result = self.provider.get_embedding("test text")
        assert result == [0.0] * 384


# ===========================================================================
# get_embeddings_batch — edge cases
# ===========================================================================

class TestGetEmbeddingsBatch:
    def setup_method(self):
        self.provider = _make_provider()

    def test_empty_list_returns_empty(self):
        assert self.provider.get_embeddings_batch([]) == []

    def test_batch_calls_model(self):
        fake_embeddings = np.random.rand(3, 384).astype(np.float32)
        with patch("app.ai.embeddings._sentence_transformer_model") as mock_model:
            mock_model.encode.return_value = fake_embeddings
            result = self.provider.get_embeddings_batch(["a", "b", "c"])
        assert len(result) == 3
        assert len(result[0]) == 384

    def test_batch_error_returns_zero_vectors(self):
        with patch("app.ai.embeddings._sentence_transformer_model") as mock_model:
            mock_model.encode.side_effect = RuntimeError("batch crash")
            result = self.provider.get_embeddings_batch(["a", "b"])
        assert len(result) == 2
        assert result[0] == [0.0] * 384
