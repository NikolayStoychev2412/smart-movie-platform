#!/usr/bin/env python3
"""
Import movies from Hugging Face movies dataset CSV.
Dataset: https://huggingface.co/datasets/Pablinho/movies-dataset

Usage:
    python scripts/import_from_huggingface_csv.py --limit 100
    python scripts/import_from_huggingface_csv.py --all
"""
import sys
import os
import argparse
import logging
from pathlib import Path

# Add project root to path
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

import pandas as pd
from app.database import SessionLocal
from app.models import Movie, Review, User  # ✨ FIXED: Import all models

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Dataset URL
CSV_URL = "https://huggingface.co/datasets/Pablinho/movies-dataset/resolve/main/9000plus.csv"


def clean_text(text):
    """Clean text field"""
    if pd.isna(text) or text == "":
        return None
    return str(text).strip()


def import_movies(limit: int = None):
    """
    Import movies from Hugging Face CSV dataset.
    
    Args:
        limit: Maximum number of movies to import (None = import all)
    """
    logger.info("🚀 Starting movie import from Hugging Face dataset...")
    logger.info(f"📥 Downloading CSV from: {CSV_URL}")
    
    try:
        # Read CSV
        df = pd.read_csv(CSV_URL)
        logger.info(f"📊 Dataset loaded: {len(df)} movies found")
        
        # Show columns
        logger.info(f"📋 Columns available: {df.columns.tolist()}")
        
        # Limit if specified
        if limit:
            df = df.head(limit)
            logger.info(f"🔢 Limiting to first {limit} movies")
        
        # Connect to database
        db = SessionLocal()
        
        imported = 0
        skipped = 0
        errors = 0
        
        # Process each movie
        for idx, row in df.iterrows():
            try:
                # Extract fields (adjust column names based on actual CSV structure)
                # Common column names in movie datasets:
                title = clean_text(row.get('title') or row.get('Title') or row.get('name'))
                
                # Handle genres
                genres = clean_text(
                    row.get('genres') or 
                    row.get('genre') or 
                    row.get('Genre') or 
                    row.get('category')
                )
                
                # Handle summary/overview
                summary = clean_text(
                    row.get('overview') or 
                    row.get('summary') or 
                    row.get('description') or 
                    row.get('plot') or
                    row.get('Overview')
                )
                
                # Handle poster
                poster_url = clean_text(
                    row.get('poster_path') or 
                    row.get('poster_url') or 
                    row.get('image')
                )
                
                # Validate required fields
                if not title:
                    logger.debug(f"Skipping row {idx}: No title")
                    skipped += 1
                    continue
                
                if not summary or len(summary) < 20:
                    logger.debug(f"Skipping '{title}': Summary too short or missing")
                    skipped += 1
                    continue
                
                # Set default genre if missing
                if not genres:
                    genres = "Unknown"
                
                # Check if movie already exists
                existing = db.query(Movie).filter(Movie.title == title).first()
                if existing:
                    logger.debug(f"Skipping '{title}': Already exists")
                    skipped += 1
                    continue
                
                # Create movie
                movie = Movie(
                    title=title,
                    genre=genres,
                    summary=summary,
                    poster_url=poster_url,
                    average_rating=0.0
                )
                
                db.add(movie)
                db.commit()
                db.refresh(movie)
                
                imported += 1
                
                if imported % 50 == 0:
                    logger.info(f"✅ Progress: {imported} imported, {skipped} skipped")
                
            except Exception as e:
                logger.error(f"Error processing row {idx}: {e}")
                db.rollback()
                errors += 1
                continue
        
        # Final stats
        logger.info("=" * 70)
        logger.info("✨ Import complete!")
        logger.info(f"   Total processed: {len(df)}")
        logger.info(f"   ✅ Imported: {imported}")
        logger.info(f"   ⏭️  Skipped: {skipped}")
        logger.info(f"   ❌ Errors: {errors}")
        logger.info("=" * 70)
        
        db.close()
        
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


def preview_dataset():
    """Preview the dataset structure"""
    logger.info("🔍 Previewing dataset...")
    
    try:
        df = pd.read_csv(CSV_URL, nrows=5)
        
        print("\n" + "=" * 70)
        print("📊 DATASET PREVIEW")
        print("=" * 70)
        print(f"\n📋 Columns ({len(df.columns)}):")
        for col in df.columns:
            print(f"  - {col}")
        
        print(f"\n📄 First 3 rows:")
        print(df.head(3).to_string())
        
        print("\n" + "=" * 70)
        
    except Exception as e:
        logger.error(f"Error previewing dataset: {e}")


def main():
    """Main CLI interface"""
    parser = argparse.ArgumentParser(
        description="Import movies from Hugging Face CSV dataset"
    )
    
    parser.add_argument(
        '--limit',
        type=int,
        help='Maximum number of movies to import'
    )
    
    parser.add_argument(
        '--all',
        action='store_true',
        help='Import all movies from dataset'
    )
    
    parser.add_argument(
        '--preview',
        action='store_true',
        help='Preview dataset structure without importing'
    )
    
    args = parser.parse_args()
    
    print("\n" + "=" * 70)
    print("🎬 Hugging Face Movie Dataset Importer")
    print("=" * 70 + "\n")
    
    if args.preview:
        preview_dataset()
    elif args.all:
        import_movies(limit=None)
    elif args.limit:
        import_movies(limit=args.limit)
    else:
        print("Please specify an option:")
        print("  --preview       Preview dataset structure")
        print("  --limit N       Import first N movies")
        print("  --all           Import all movies")
        print("\nExample: python scripts/import_from_huggingface_csv.py --limit 100")
    
    print("\n" + "=" * 70)
    print("✅ Done!")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()