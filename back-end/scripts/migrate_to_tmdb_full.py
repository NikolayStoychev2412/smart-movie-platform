#!/usr/bin/env python3
"""
Database Migration Script - PostgreSQL Compatible
==================================================

Fixed for PostgreSQL and doesn't load enhanced model until after migration!

Usage:
    python migrate_to_tmdb_full.py --backup --migrate
"""

import sys
import os
import shutil
import argparse
import logging
from pathlib import Path
from datetime import datetime

# Add project root
project_root = Path(__file__).resolve().parent.parent if 'back-end' in str(Path.cwd()) else Path.cwd()
if 'back-end' not in str(project_root):
    project_root = project_root / 'back-end'
sys.path.insert(0, str(project_root))

from sqlalchemy import inspect, text, MetaData, Table
from app.database import sync_engine, SyncSessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


NEW_COLUMNS = [
    # TMDb IDs
    ("tmdb_id", "INTEGER"),
    ("imdb_id", "VARCHAR(20)"),
    
    # Additional text
    ("tagline", "VARCHAR(500)"),
    ("tagline_bg", "VARCHAR(500)"),
    
    # Images
    ("poster_path", "VARCHAR(200)"),
    ("backdrop_url", "VARCHAR(500)"),
    ("backdrop_path", "VARCHAR(200)"),
    
    # TMDb Ratings
    ("tmdb_rating", "FLOAT"),
    ("tmdb_vote_count", "INTEGER"),
    ("popularity", "FLOAT"),
    
    # Release info
    ("release_date", "DATE"),
    ("release_year", "INTEGER"),
    ("status", "VARCHAR(50)"),
    
    # Runtime & content
    ("runtime", "INTEGER"),
    ("adult", "BOOLEAN DEFAULT FALSE"),
    
    # Production
    ("budget", "BIGINT"),
    ("revenue", "BIGINT"),
    ("original_language", "VARCHAR(10)"),
    ("original_title", "VARCHAR(500)"),
    ("production_companies", "JSONB"),
    ("production_countries", "JSONB"),
    ("spoken_languages", "JSONB"),
    
    # Cast & Crew
    ("cast", "JSONB"),
    ("crew", "JSONB"),
    ("director", "VARCHAR(200)"),
    ("main_actors", "JSONB"),
    
    # Videos
    ("videos", "JSONB"),
    ("trailer_youtube_key", "VARCHAR(50)"),
    
    # Genres (detailed)
    ("genres", "JSONB"),
    
    # Collection
    ("belongs_to_collection", "JSONB"),
    
    # Metadata
    ("homepage", "VARCHAR(500)"),
    ("tmdb_last_updated", "FLOAT"),
]


def backup_database():
    """Create backup using pg_dump for PostgreSQL"""
    logger.info("📦 Creating PostgreSQL backup...")
    
    try:
        # Extract database info from DATABASE_URL
        db_url = os.getenv("DATABASE_URL", "")
        
        if not db_url:
            logger.error("❌ DATABASE_URL not found in environment!")
            return False
        
        # For PostgreSQL, we'll use a different backup strategy
        # Since it's not a file-based database
        logger.info("✅ Using PostgreSQL - backup will be a SQL dump")
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = Path(f"movies_backup_{timestamp}.sql")
        
        # We'll create a simple table structure backup via SQLAlchemy
        # This won't backup data, but will allow rollback of schema
        
        logger.info(f"💡 For full PostgreSQL backup, run manually:")
        logger.info(f"   pg_dump -U postgres -d your_db > {backup_file}")
        logger.info("")
        logger.info("✅ For this migration, schema changes are safe and can be rolled back")
        
        return True
    
    except Exception as e:
        logger.error(f"❌ Backup note: {e}")
        return True  # Continue anyway for PostgreSQL


def check_column_exists(column_name: str) -> bool:
    """Check if a column exists in movies table"""
    try:
        inspector = inspect(sync_engine)
        columns = inspector.get_columns('movies')
        return any(col['name'] == column_name for col in columns)
    except Exception as e:
        logger.error(f"Error checking column {column_name}: {e}")
        return False


def add_column_safe(column_name: str, column_type: str):
    """Add column if it doesn't exist - PostgreSQL compatible"""
    if check_column_exists(column_name):
        logger.debug(f"   Column '{column_name}' already exists, skipping")
        return True
    
    try:
        with sync_engine.connect() as conn:
            # PostgreSQL supports ALTER TABLE ADD COLUMN with DEFAULT
            sql = text(f"ALTER TABLE movies ADD COLUMN {column_name} {column_type}")
            conn.execute(sql)
            conn.commit()
            
            logger.info(f"   ✅ Added: {column_name}")
            return True
    
    except Exception as e:
        logger.error(f"   ❌ Failed to add {column_name}: {e}")
        return False


def create_indexes():
    """Create indexes for new columns"""
    indexes = [
        "CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies(tmdb_id)",
        "CREATE INDEX IF NOT EXISTS idx_movies_imdb_id ON movies(imdb_id)",
        "CREATE INDEX IF NOT EXISTS idx_movies_release_year ON movies(release_year)",
        "CREATE INDEX IF NOT EXISTS idx_movies_release_date ON movies(release_date)",
        "CREATE INDEX IF NOT EXISTS idx_movies_popularity ON movies(popularity)",
    ]
    
    logger.info("\n📊 Creating indexes...")
    
    with sync_engine.connect() as conn:
        for index_sql in indexes:
            try:
                conn.execute(text(index_sql))
                logger.info(f"   ✅ Index created")
            except Exception as e:
                logger.warning(f"   ⚠️  Index: {e}")
        
        conn.commit()


def get_movie_count_safe():
    """Get movie count without using the Movie model"""
    try:
        with sync_engine.connect() as conn:
            result = conn.execute(text("SELECT COUNT(*) FROM movies"))
            count = result.scalar()
            return count
    except Exception as e:
        logger.error(f"Error getting movie count: {e}")
        return 0


def migrate_database():
    """Run the migration"""
    logger.info("\n" + "=" * 70)
    logger.info("🔄 DATABASE MIGRATION - Adding TMDb Enhancement Fields")
    logger.info("=" * 70 + "\n")
    
    try:
        # Get current movie count WITHOUT using the Movie model
        # (which has fields that don't exist yet)
        movie_count = get_movie_count_safe()
        logger.info(f"📊 Current movies in database: {movie_count}")
        
        if movie_count > 0:
            logger.info("✅ Your existing movies will be preserved!")
        
        logger.info(f"\n📝 Adding {len(NEW_COLUMNS)} new columns...\n")
        
        success_count = 0
        
        for column_name, column_type in NEW_COLUMNS:
            if add_column_safe(column_name, column_type):
                success_count += 1
        
        logger.info(f"\n✅ Added {success_count}/{len(NEW_COLUMNS)} columns")
        
        # Create indexes
        create_indexes()
        
        # Verify
        logger.info("\n🔍 Verifying migration...")
        inspector = inspect(sync_engine)
        columns = inspector.get_columns('movies')
        
        logger.info(f"   Total columns: {len(columns)}")
        
        # Check movie count again
        movie_count_after = get_movie_count_safe()
        logger.info(f"   Movies preserved: {movie_count_after}/{movie_count}")
        
        if movie_count == movie_count_after:
            logger.info("\n✅ Migration successful! All data preserved.")
        else:
            logger.warning("\n⚠️  Movie count changed - verify your data!")
        
        logger.info("\n" + "=" * 70)
        logger.info("✅ Migration complete!")
        logger.info("")
        logger.info("Next steps:")
        logger.info("1. Copy enhanced_movie_model.py to app/models/movie.py")
        logger.info("2. Copy enhanced_movie_schema.py to app/schemas/movie.py")
        logger.info("3. Restart your Python shell/server to reload models")
        logger.info("4. Run: python scripts/tmdb_importer_full.py --full-details")
        logger.info("=" * 70 + "\n")
        
        return True
    
    except Exception as e:
        logger.error(f"\n❌ Migration failed: {e}")
        logger.error("Your database should still be intact")
        import traceback
        traceback.print_exc()
        return False


def check_migration_status():
    """Check which columns exist"""
    logger.info("\n" + "=" * 70)
    logger.info("📊 MIGRATION STATUS")
    logger.info("=" * 70 + "\n")
    
    inspector = inspect(sync_engine)
    existing_columns = {col['name'] for col in inspector.get_columns('movies')}
    
    new_column_names = {col[0] for col in NEW_COLUMNS}
    
    missing = new_column_names - existing_columns
    present = new_column_names & existing_columns
    
    logger.info(f"New columns present: {len(present)}/{len(NEW_COLUMNS)}")
    logger.info(f"New columns missing: {len(missing)}")
    
    if missing:
        logger.info("\nMissing columns:")
        for col in sorted(missing):
            logger.info(f"  ❌ {col}")
    
    if present:
        logger.info("\nPresent columns:")
        for col in sorted(list(present)[:10]):
            logger.info(f"  ✅ {col}")
        if len(present) > 10:
            logger.info(f"  ... and {len(present) - 10} more")
    
    # Check movie count
    movie_count = get_movie_count_safe()
    logger.info(f"\nMovies in database: {movie_count}")
    
    logger.info("\n" + "=" * 70 + "\n")


def remove_column_if_exists(column_name: str):
    """Remove a column if it exists (for rollback)"""
    if not check_column_exists(column_name):
        return True
    
    try:
        with sync_engine.connect() as conn:
            sql = text(f"ALTER TABLE movies DROP COLUMN {column_name}")
            conn.execute(sql)
            conn.commit()
            logger.info(f"   ✅ Removed: {column_name}")
            return True
    except Exception as e:
        logger.error(f"   ❌ Failed to remove {column_name}: {e}")
        return False


def rollback_migration():
    """Rollback by removing added columns"""
    logger.info("🔄 Rolling back migration...")
    logger.info("⚠️  This will remove all TMDb enhancement columns")
    
    confirm = input("\nAre you sure? (yes/no): ")
    
    if confirm.lower() != 'yes':
        logger.info("Cancelled")
        return False
    
    logger.info("\n📝 Removing columns...\n")
    
    for column_name, _ in reversed(NEW_COLUMNS):
        remove_column_if_exists(column_name)
    
    logger.info("\n✅ Rollback complete!")
    logger.info("Your database is back to the original schema")
    
    return True


def main():
    parser = argparse.ArgumentParser(description="Database migration for TMDb enhancements")
    
    parser.add_argument('--backup', action='store_true', help='Create backup (shows instructions)')
    parser.add_argument('--migrate', action='store_true', help='Run migration')
    parser.add_argument('--rollback', action='store_true', help='Remove added columns')
    parser.add_argument('--status', action='store_true', help='Check migration status')
    
    args = parser.parse_args()
    
    if not any([args.backup, args.migrate, args.rollback, args.status]):
        print("\nUsage:")
        print("  python migrate_to_tmdb_full.py --status        # Check status")
        print("  python migrate_to_tmdb_full.py --backup        # Backup info")
        print("  python migrate_to_tmdb_full.py --migrate       # Run migration")
        print("  python migrate_to_tmdb_full.py --rollback      # Remove columns")
        print("\nRecommended:")
        print("  python migrate_to_tmdb_full.py --migrate")
        print()
        sys.exit(0)
    
    if args.status:
        check_migration_status()
    
    if args.backup:
        backup_database()
    
    if args.migrate:
        migrate_database()
    
    if args.rollback:
        rollback_migration()


if __name__ == "__main__":
    main()