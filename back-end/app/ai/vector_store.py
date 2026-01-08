# app/ai/vector_store.py
"""
Vector storage using FAISS for similarity search.
Can be swapped with Milvus/Pinecone for production.
"""
import os
import pickle
import logging
from pathlib import Path
from typing import List, Tuple, Optional, Dict
import numpy as np

logger = logging.getLogger(__name__)

# Lazy import
_faiss = None


def get_faiss():
    """Lazy import of FAISS"""
    global _faiss
    if _faiss is None:
        import faiss
        _faiss = faiss
    return _faiss


class VectorStore:
    """
    FAISS-based vector store for similarity search.
    Stores movie embeddings and enables fast nearest neighbor search.
    """
    
    def __init__(self, dimension: int = 384, index_path: str = "data/faiss_index"):
        """
        Initialize vector store.
        
        Args:
            dimension: Embedding dimension
            index_path: Path to save/load FAISS index
        """
        self.dimension = dimension
        self.index_path = Path(index_path)
        self.index_path.parent.mkdir(parents=True, exist_ok=True)
        
        faiss = get_faiss()
        
        # Create FAISS index (Inner Product for cosine similarity)
        self.index = faiss.IndexFlatIP(dimension)
        
        # Mapping from FAISS index to movie IDs
        self.id_map: List[int] = []
        
        # Load existing index if available
        self.load()
        
        logger.info(f"Initialized VectorStore (dim={dimension}, indexed={self.index.ntotal})")
    
    def add_vectors(self, movie_ids: List[int], vectors: List[List[float]]):
        """
        Add vectors to the index.
        
        Args:
            movie_ids: List of movie IDs
            vectors: List of embedding vectors (must be normalized)
        """
        if not movie_ids or not vectors:
            return
        
        # Convert to numpy and normalize
        vectors_np = np.array(vectors, dtype=np.float32)
        
        # Normalize for cosine similarity (using Inner Product)
        norms = np.linalg.norm(vectors_np, axis=1, keepdims=True)
        norms[norms == 0] = 1  # Avoid division by zero
        vectors_normalized = vectors_np / norms
        
        # Add to FAISS index
        self.index.add(vectors_normalized)
        
        # Update ID mapping
        self.id_map.extend(movie_ids)
        
        logger.info(f"Added {len(movie_ids)} vectors to index (total: {self.index.ntotal})")
    
    def search(
        self,
        query_vector: List[float],
        top_k: int = 20,
        filter_ids: Optional[List[int]] = None
    ) -> List[Tuple[int, float]]:
        """
        Search for similar vectors.
        
        Args:
            query_vector: Query embedding vector
            top_k: Number of results to return
            filter_ids: Optional list of movie IDs to filter results
            
        Returns:
            List of (movie_id, similarity_score) tuples, sorted by score descending
        """
        if self.index.ntotal == 0:
            return []
        
        # Normalize query vector
        query_np = np.array([query_vector], dtype=np.float32)
        norm = np.linalg.norm(query_np)
        if norm > 0:
            query_np = query_np / norm
        
        # Search
        search_k = top_k * 3 if filter_ids else top_k
        scores, indices = self.index.search(query_np, min(search_k, self.index.ntotal))
        
        # Convert to list of (movie_id, score)
        results = []
        for idx, score in zip(indices[0], scores[0]):
            if idx < len(self.id_map):
                movie_id = self.id_map[idx]
                
                # Apply filter if provided
                if filter_ids and movie_id not in filter_ids:
                    continue
                
                results.append((movie_id, float(score)))
                
                if len(results) >= top_k:
                    break
        
        return results
    
    def get_vector(self, movie_id: int) -> Optional[List[float]]:
        """Get vector for a specific movie ID"""
        try:
            idx = self.id_map.index(movie_id)
            vector = self.index.reconstruct(idx)
            return vector.tolist()
        except (ValueError, RuntimeError):
            return None
    
    def remove_vector(self, movie_id: int) -> bool:
        """Remove a vector from the index"""
        if movie_id not in self.id_map:
            return False
        
        idx = self.id_map.index(movie_id)
        self.id_map.pop(idx)
        
        # Rebuild index (FAISS doesn't support efficient deletion)
        if self.index.ntotal > 0:
            vectors = []
            for i in range(self.index.ntotal):
                if i != idx:
                    vectors.append(self.index.reconstruct(i))
            
            faiss = get_faiss()
            self.index = faiss.IndexFlatIP(self.dimension)
            
            if vectors:
                self.index.add(np.array(vectors, dtype=np.float32))
        
        logger.info(f"Removed vector for movie {movie_id}")
        return True
    
    def save(self):
        """Save index and ID mapping to disk"""
        try:
            faiss = get_faiss()
            
            index_file = str(self.index_path) + ".index"
            faiss.write_index(self.index, index_file)
            
            map_file = str(self.index_path) + ".map"
            with open(map_file, 'wb') as f:
                pickle.dump(self.id_map, f)
            
            logger.info(f"Saved vector store to {self.index_path}")
        except Exception as e:
            logger.error(f"Error saving vector store: {e}")
    
    def load(self):
        """Load index and ID mapping from disk"""
        try:
            index_file = str(self.index_path) + ".index"
            map_file = str(self.index_path) + ".map"
            
            if not Path(index_file).exists() or not Path(map_file).exists():
                logger.info("No existing index found, starting fresh")
                return
            
            faiss = get_faiss()
            
            self.index = faiss.read_index(index_file)
            
            with open(map_file, 'rb') as f:
                self.id_map = pickle.load(f)
            
            logger.info(f"Loaded vector store from {self.index_path} ({self.index.ntotal} vectors)")
        except Exception as e:
            logger.error(f"Error loading vector store: {e}")
    
    def clear(self):
        """Clear the entire index"""
        faiss = get_faiss()
        self.index = faiss.IndexFlatIP(self.dimension)
        self.id_map = []
        logger.info("Cleared vector store")
    
    def stats(self) -> Dict:
        """Get statistics about the index"""
        return {
            "total_vectors": self.index.ntotal,
            "dimension": self.dimension,
            "total_movies": len(set(self.id_map)),
            "index_path": str(self.index_path)
        }


# Singleton instance
_vector_store: Optional[VectorStore] = None


def get_vector_store() -> VectorStore:
    """Get singleton vector store instance"""
    global _vector_store
    
    if _vector_store is None:
        dimension = int(os.getenv("EMBEDDING_DIMENSION", "384"))
        index_path = os.getenv("FAISS_INDEX_PATH", "data/faiss_index")
        _vector_store = VectorStore(dimension=dimension, index_path=index_path)
    
    return _vector_store