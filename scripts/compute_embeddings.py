#!/usr/bin/env python3
"""
Compute and store embeddings for all movies.
Run this script once to build the initial index, and periodically to update.

Usage:
    python scripts/compute_embeddings.py
    python scripts/compute_embeddings.py --batch-size 50
    python scripts/compute_embeddings.py --force-rebuild
"""
import sys
import os
import argparse
import logging
from pathlib import Path

# Add project root to path
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

from app.database import SessionLocal
from app.models.movie import Movie
from app.ai.embeddings import get_embedding_provider
from app.ai.vector_store import get_vector_store

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def build_movie_text(movie: Movie) -> str:
    """
    Build rich text representation of a movie for embedding.
    Combines title, genre, and summary.
    """
    parts = []
    
    if movie.title:
        parts.append(f"Title: {movie.title}")
    
    if movie.genre:
        parts.append(f"Genre: {movie.genre}")
    
    if movie.summary:
        parts.append(f"Summary: {movie.summary}")
    
    return ". ".join(parts)


def compute_embeddings(batch_size: int = 10, force_rebuild: bool = False):
    """
    Compute embeddings for all movies and store in vector index.
    
    Args:
        batch_size: Number of movies to process at once
        force_rebuild: If True, rebuild entire index from scratch
    """
    logger.info("🚀 Starting embedding computation...")
    
    db = SessionLocal()
    embedding_provider = get_embedding_provider()
    vector_store = get_vector_store()
    
    try:
        # Get all movies
        movies = db.query(Movie).all()
        total_movies = len(movies)
        
        if total_movies == 0:
            logger.warning("⚠️  No movies found in database!")
            return
        
        logger.info(f"📊 Found {total_movies} movies in database")
        
        # Check if rebuild needed
        current_vectors = vector_store.stats()["total_vectors"]
        if current_vectors > 0 and not force_rebuild:
            logger.info(f"ℹ️  Index already has {current_vectors} vectors")
            response = input("Rebuild entire index? (yes/no): ").strip().lower()
            if response != 'yes':
                logger.info("Skipping rebuild")
                return
        
        # Clear index if rebuilding
        if force_rebuild or current_vectors > 0:
            logger.info("🗑️  Clearing existing index...")
            vector_store.clear()
        
        # Process in batches
        processed = 0
        skipped = 0
        
        for i in range(0, total_movies, batch_size):
            batch = movies[i:i+batch_size]
            batch_num = (i // batch_size) + 1
            total_batches = (total_movies + batch_size - 1) // batch_size
            
            logger.info(f"📦 Processing batch {batch_num}/{total_batches} ({len(batch)} movies)...")
            
            # Build texts
            batch_texts = []
            batch_ids = []
            
            for movie in batch:
                text = build_movie_text(movie)
                
                if not text or len(text.strip()) < 10:
                    logger.warning(f"⚠️  Skipping movie {movie.id} '{movie.title}' - insufficient text")
                    skipped += 1
                    continue
                
                batch_texts.append(text)
                batch_ids.append(movie.id)
            
            if not batch_texts:
                continue
            
            # Generate embeddings
            logger.info(f"   Generating {len(batch_texts)} embeddings...")
            embeddings = embedding_provider.get_embeddings_batch(batch_texts)
            
            # Add to vector store
            logger.info(f"   Adding to vector store...")
            vector_store.add_vectors(batch_ids, embeddings)
            
            processed += len(batch_texts)
            
            # Progress update
            logger.info(f"   ✅ Progress: {processed}/{total_movies} ({processed/total_movies*100:.1f}%)")
        
        # Save index to disk
        logger.info("💾 Saving vector store to disk...")
        vector_store.save()
        
        # Final stats
        stats = vector_store.stats()
        logger.info("=" * 70)
        logger.info("✨ Embedding computation complete!")
        logger.info(f"   Total movies processed: {processed}")
        logger.info(f"   Skipped: {skipped}")
        logger.info(f"   Vectors in index: {stats['total_vectors']}")
        logger.info(f"   Dimension: {stats['dimension']}")
        logger.info(f"   Index saved to: {stats['index_path']}")
        logger.info("=" * 70)
        
    except KeyboardInterrupt:
        logger.warning("\n⚠️  Interrupted by user")
        logger.info("💾 Saving partial progress...")
        vector_store.save()
        sys.exit(1)
    
    except Exception as e:
        logger.error(f"❌ Error: {e}", exc_info=True)
        sys.exit(1)
    
    finally:
        db.close()


def update_single_movie(movie_id: int):
    """
    Update embedding for a single movie.
    Useful for when a movie is added or updated.
    """
    logger.info(f"🔄 Updating embedding for movie {movie_id}...")
    
    db = SessionLocal()
    embedding_provider = get_embedding_provider()
    vector_store = get_vector_store()
    
    try:
        # Get movie
        movie = db.query(Movie).filter(Movie.id == movie_id).first()
        
        if not movie:
            logger.error(f"❌ Movie {movie_id} not found!")
            return False
        
        # Build text
        text = build_movie_text(movie)
        
        if not text or len(text.strip()) < 10:
            logger.error(f"❌ Movie has insufficient text for embedding")
            return False
        
        # Generate embedding
        logger.info(f"   Generating embedding...")
        embedding = embedding_provider.get_embedding(text)
        
        # Remove old vector if exists
        vector_store.remove_vector(movie_id)
        
        # Add new vector
        logger.info(f"   Adding to vector store...")
        vector_store.add_vectors([movie_id], [embedding])
        
        # Save
        vector_store.save()
        
        logger.info(f"✅ Successfully updated embedding for '{movie.title}'")
        return True
    
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        return False
    
    finally:
        db.close()


def verify_index():
    """Verify the integrity of the vector index"""
    logger.info("🔍 Verifying vector index...")
    
    db = SessionLocal()
    vector_store = get_vector_store()
    
    try:
        # Get stats
        stats = vector_store.stats()
        logger.info(f"   Total vectors: {stats['total_vectors']}")
        logger.info(f"   Dimension: {stats['dimension']}")
        
        # Check if all movies have vectors
        movies = db.query(Movie).all()
        missing = []
        
        for movie in movies:
            vector = vector_store.get_vector(movie.id)
            if vector is None:
                missing.append((movie.id, movie.title))
        
        if missing:
            logger.warning(f"⚠️  {len(missing)} movies are missing embeddings:")
            for movie_id, title in missing[:10]:
                logger.warning(f"   - {movie_id}: {title}")
            if len(missing) > 10:
                logger.warning(f"   ... and {len(missing) - 10} more")
        else:
            logger.info("✅ All movies have embeddings!")
        
        return len(missing) == 0
    
    finally:
        db.close()


def main():
    """Main CLI interface"""
    parser = argparse.ArgumentParser(
        description="Compute and manage movie embeddings for semantic search"
    )
    
    parser.add_argument(
        '--batch-size',
        type=int,
        default=10,
        help='Number of movies to process at once (default: 10)'
    )
    
    parser.add_argument(
        '--force-rebuild',
        action='store_true',
        help='Force rebuild of entire index'
    )
    
    parser.add_argument(
        '--update',
        type=int,
        metavar='MOVIE_ID',
        help='Update embedding for a single movie'
    )
    
    parser.add_argument(
        '--verify',
        action='store_true',
        help='Verify index integrity'
    )
    
    args = parser.parse_args()
    
    print("\n" + "=" * 70)
    print("🎬 Movie Embedding Manager")
    print("=" * 70 + "\n")
    
    if args.verify:
        verify_index()
    elif args.update:
        update_single_movie(args.update)
    else:
        compute_embeddings(
            batch_size=args.batch_size,
            force_rebuild=args.force_rebuild
        )
    
    print("\n" + "=" * 70)
    print("👋 Done!")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()