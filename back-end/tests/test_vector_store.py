"""Tests for app.ai.vector_store — FAISS-based similarity search."""
import pytest
import numpy as np
import tempfile
import os

from app.ai.vector_store import VectorStore


@pytest.fixture
def store(tmp_path):
    """Create a VectorStore backed by a temp directory (no leftover files)."""
    index_path = str(tmp_path / "test_index")
    return VectorStore(dimension=4, index_path=index_path)


def _normalize(vec):
    """Normalize a vector to unit length (needed for cosine similarity via IP)."""
    arr = np.array(vec, dtype=np.float32)
    norm = np.linalg.norm(arr)
    return (arr / norm).tolist() if norm > 0 else arr.tolist()


# ===========================================================================
# Basic CRUD
# ===========================================================================

class TestAddAndSearch:
    def test_empty_store_returns_empty(self, store):
        results = store.search([1.0, 0.0, 0.0, 0.0], top_k=5)
        assert results == []

    def test_add_and_retrieve(self, store):
        vecs = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0]]
        store.add_vectors([10, 20, 30], vecs)
        assert store.index.ntotal == 3

    def test_search_returns_closest(self, store):
        store.add_vectors(
            [10, 20, 30],
            [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0]],
        )
        results = store.search([1, 0, 0, 0], top_k=1)
        assert len(results) == 1
        assert results[0][0] == 10  # movie_id 10 is closest
        assert results[0][1] > 0.9  # high similarity

    def test_search_ordering(self, store):
        store.add_vectors(
            [1, 2, 3],
            [[1, 0, 0, 0], [0.9, 0.1, 0, 0], [0, 0, 1, 0]],
        )
        results = store.search([1, 0, 0, 0], top_k=3)
        ids = [r[0] for r in results]
        # Movie 1 and 2 should be before movie 3
        assert ids.index(1) < ids.index(3)
        assert ids.index(2) < ids.index(3)

    def test_top_k_limits_results(self, store):
        store.add_vectors(list(range(20)), [[1, 0, 0, 0]] * 20)
        results = store.search([1, 0, 0, 0], top_k=5)
        assert len(results) == 5

    def test_add_empty_is_noop(self, store):
        store.add_vectors([], [])
        assert store.index.ntotal == 0


# ===========================================================================
# Filtering
# ===========================================================================

class TestSearchFiltering:
    def test_filter_ids(self, store):
        store.add_vectors([10, 20, 30], [[1, 0, 0, 0]] * 3)
        results = store.search([1, 0, 0, 0], top_k=10, filter_ids=[20, 30])
        ids = {r[0] for r in results}
        assert 10 not in ids
        assert 20 in ids

    def test_filter_ids_empty_list(self, store):
        # Empty filter_ids is truthy-empty: the filter loop skips everything,
        # but the code treats [] as "no filter" since `if filter_ids` is False
        store.add_vectors([10, 20], [[1, 0, 0, 0]] * 2)
        results = store.search([1, 0, 0, 0], top_k=10, filter_ids=[])
        assert len(results) == 2  # no filtering applied


# ===========================================================================
# get_vector / remove_vector
# ===========================================================================

class TestGetAndRemove:
    def test_get_existing_vector(self, store):
        store.add_vectors([42], [[0.5, 0.5, 0.5, 0.5]])
        vec = store.get_vector(42)
        assert vec is not None
        assert len(vec) == 4

    def test_get_missing_vector(self, store):
        assert store.get_vector(999) is None

    def test_remove_vector(self, store):
        store.add_vectors([1, 2, 3], [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0]])
        removed = store.remove_vector(2)
        assert removed is True
        assert store.index.ntotal == 2
        assert store.get_vector(2) is None

    def test_remove_nonexistent(self, store):
        assert store.remove_vector(999) is False


# ===========================================================================
# clear / stats
# ===========================================================================

class TestClearAndStats:
    def test_clear(self, store):
        store.add_vectors([1, 2], [[1, 0, 0, 0], [0, 1, 0, 0]])
        store.clear()
        assert store.index.ntotal == 0
        assert store.id_map == []

    def test_stats(self, store):
        store.add_vectors([1, 2, 3], [[1, 0, 0, 0]] * 3)
        s = store.stats()
        assert s["total_vectors"] == 3
        assert s["dimension"] == 4
        assert s["total_movies"] == 3


# ===========================================================================
# Persistence (save / load)
# ===========================================================================

class TestPersistence:
    def test_save_and_load(self, tmp_path):
        path = str(tmp_path / "persist_idx")
        store1 = VectorStore(dimension=4, index_path=path)
        store1.add_vectors([100, 200], [[1, 0, 0, 0], [0, 1, 0, 0]])
        store1.save()

        store2 = VectorStore(dimension=4, index_path=path)
        assert store2.index.ntotal == 2
        assert store2.id_map == [100, 200]
