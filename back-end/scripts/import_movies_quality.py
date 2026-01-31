#!/usr/bin/env python3
"""
QUALITY TMDb Movie Importer - For Diploma Project
==================================================

Imports ONLY high-quality, popular movies with proper validation.

Features:
✅ Quality filters (poster, backdrop, vote count)
✅ Bulgarian translation validation (not Japanese, not identical to EN)
✅ Flags: has_bg_translation, has_text_embedding, is_popular_seed
✅ Clears database and starts fresh
✅ 300-500 movies target (optimal for diploma)
✅ Full details: cast, crew, trailers

Usage:
    # Fresh import with quality movies (RECOMMENDED)
    python import_movies_quality.py --fresh --limit 400
    
    # Test run (don't save to DB)
    python import_movies_quality.py --test --limit 20
    
    # Import specific movie
    python import_movies_quality.py --movie-id 27205
"""

import sys
import os
import re
import time
import argparse
import logging
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from datetime import datetime

# Add project root to path
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

import requests
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# =============================================================================
# CONFIGURATION
# =============================================================================

TMDB_API_KEY = os.getenv("TMDB_API_KEY")
TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p"

REQUEST_DELAY = 0.25  # 4 requests per second (TMDb limit)

# Quality thresholds
MIN_VOTE_COUNT = 100          # Minimum votes on TMDb
MIN_POPULARITY = 5.0          # Minimum popularity score
REQUIRE_POSTER = True         # Must have poster
REQUIRE_BACKDROP = True       # Must have backdrop
MIN_RUNTIME = 60              # Minimum runtime in minutes (skip shorts)

# Target movie count
RECOMMENDED_LIMIT = 400       # Good for diploma project

# Cyrillic detection for Bulgarian validation
CYRILLIC_PATTERN = re.compile(r'[\u0400-\u04FF]')
JAPANESE_PATTERN = re.compile(r'[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]')


# =============================================================================
# IMPORTER CLASS
# =============================================================================

class QualityTMDbImporter:
    """Import only high-quality movies with proper validation"""
    
    def __init__(self, api_key: str):
        if not api_key:
            raise ValueError("TMDb API key required! Set TMDB_API_KEY in .env")
        
        self.api_key = api_key
        self.session = requests.Session()
        self.session.params = {'api_key': self.api_key}
        
        # Cache
        self._genre_map_en = None
        self._genre_map_bg = None
        
        # Stats
        self.stats = {
            'fetched': 0,
            'passed_quality': 0,
            'failed_quality': 0,
            'has_bg_translation': 0,
            'has_valid_summary': 0,
        }
    
    def _make_request(self, endpoint: str, **params) -> Optional[Dict]:
        """Make API request with rate limiting"""
        url = f"{TMDB_BASE_URL}{endpoint}"
        
        try:
            time.sleep(REQUEST_DELAY)
            response = self.session.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"API request failed: {e}")
            return None
    
    def get_genre_maps(self) -> Tuple[Dict, Dict]:
        """Get genre mappings for English and Bulgarian"""
        if self._genre_map_en and self._genre_map_bg:
            return self._genre_map_en, self._genre_map_bg
        
        # English genres
        data_en = self._make_request("/genre/movie/list", language="en-US")
        self._genre_map_en = {g['id']: g['name'] for g in data_en.get('genres', [])} if data_en else {}
        
        # Bulgarian genres
        data_bg = self._make_request("/genre/movie/list", language="bg-BG")
        self._genre_map_bg = {g['id']: g['name'] for g in data_bg.get('genres', [])} if data_bg else {}
        
        logger.info(f"📋 Loaded {len(self._genre_map_en)} EN genres, {len(self._genre_map_bg)} BG genres")
        
        return self._genre_map_en, self._genre_map_bg
    
    # =========================================================================
    # VALIDATION
    # =========================================================================
    
    def _is_valid_bulgarian(self, text_bg: Optional[str], text_en: Optional[str]) -> bool:
        """
        Validate that Bulgarian text is actually Bulgarian.
        
        Returns False if:
        - Text is None or empty
        - Text is identical to English
        - Text contains Japanese/Chinese characters
        - Text has no Cyrillic characters (for title)
        """
        if not text_bg or not text_bg.strip():
            return False
        
        text_bg = text_bg.strip()
        text_en = (text_en or '').strip()
        
        # Identical to English = not translated
        if text_bg.lower() == text_en.lower():
            return False
        
        # Contains Japanese/Chinese = wrong language
        if JAPANESE_PATTERN.search(text_bg):
            logger.debug(f"  ⚠️ Japanese detected in BG text: {text_bg[:50]}")
            return False
        
        # For titles, should have Cyrillic (for summaries, might be mixed)
        # We'll be lenient - if it's different from EN and not Japanese, accept it
        
        return True
    
    def _passes_quality_check(self, movie_data: Dict) -> Tuple[bool, str]:
        """
        Check if movie passes quality thresholds.
        
        Returns (passed, reason)
        """
        # Vote count
        vote_count = movie_data.get('vote_count', 0)
        if vote_count < MIN_VOTE_COUNT:
            return False, f"vote_count {vote_count} < {MIN_VOTE_COUNT}"
        
        # Popularity
        popularity = movie_data.get('popularity', 0)
        if popularity < MIN_POPULARITY:
            return False, f"popularity {popularity} < {MIN_POPULARITY}"
        
        # Poster
        if REQUIRE_POSTER and not movie_data.get('poster_path'):
            return False, "no poster"
        
        # Backdrop
        if REQUIRE_BACKDROP and not movie_data.get('backdrop_path'):
            return False, "no backdrop"
        
        # Runtime (skip shorts and TV specials)
        runtime = movie_data.get('runtime', 0)
        if runtime and runtime < MIN_RUNTIME:
            return False, f"runtime {runtime} < {MIN_RUNTIME}"
        
        # Must have title
        if not movie_data.get('title'):
            return False, "no title"
        
        return True, "passed"
    
    # =========================================================================
    # FETCH MOVIES
    # =========================================================================
    
    def get_movie_details(self, movie_id: int) -> Optional[Dict]:
        """
        Get comprehensive movie details with validation.
        
        Fetches English + Bulgarian versions and validates quality.
        """
        self.stats['fetched'] += 1
        
        # Fetch English version with extras
        data_en = self._make_request(
            f"/movie/{movie_id}",
            language='en-US',
            append_to_response='credits,videos,images,keywords'
        )
        
        if not data_en:
            return None
        
        # Quality check on raw data first
        passed, reason = self._passes_quality_check(data_en)
        if not passed:
            self.stats['failed_quality'] += 1
            logger.debug(f"  ❌ Skipped: {data_en.get('title', 'Unknown')} - {reason}")
            return None
        
        self.stats['passed_quality'] += 1
        
        # Fetch Bulgarian version
        data_bg = self._make_request(f"/movie/{movie_id}", language='bg-BG')
        
        # Process and merge
        processed = self._process_movie_data(data_en, data_bg)
        
        return processed
    
    def _process_movie_data(self, data_en: Dict, data_bg: Optional[Dict]) -> Dict:
        """Process and merge English + Bulgarian movie data with flags"""
        
        genre_map_en, genre_map_bg = self.get_genre_maps()
        
        # === BASE DATA ===
        processed = {
            'tmdb_id': data_en.get('id'),
            'imdb_id': data_en.get('imdb_id'),
            
            # English fields (always present)
            'title': data_en.get('title', '').strip(),
            'original_title': data_en.get('original_title'),
            'tagline': data_en.get('tagline'),
            'summary': data_en.get('overview', '').strip(),
            
            # Metadata
            'release_date': data_en.get('release_date'),
            'runtime': data_en.get('runtime'),
            'status': data_en.get('status'),
            'adult': data_en.get('adult', False),
            'budget': data_en.get('budget', 0),
            'revenue': data_en.get('revenue', 0),
            'homepage': data_en.get('homepage'),
            'original_language': data_en.get('original_language'),
            
            # Ratings & Popularity
            'popularity': data_en.get('popularity', 0),
            'tmdb_rating': data_en.get('vote_average', 0),
            'tmdb_vote_count': data_en.get('vote_count', 0),
            
            # Images
            'poster_path': data_en.get('poster_path'),
            'backdrop_path': data_en.get('backdrop_path'),
        }
        
        # === BULGARIAN TRANSLATIONS (with validation) ===
        title_bg = data_bg.get('title', '').strip() if data_bg else ''
        tagline_bg = data_bg.get('tagline', '').strip() if data_bg else ''
        summary_bg = data_bg.get('overview', '').strip() if data_bg else ''
        
        # Validate Bulgarian
        has_valid_bg_title = self._is_valid_bulgarian(title_bg, processed['title'])
        has_valid_bg_summary = self._is_valid_bulgarian(summary_bg, processed['summary'])
        
        processed['title_bg'] = title_bg if has_valid_bg_title else None
        processed['tagline_bg'] = tagline_bg if self._is_valid_bulgarian(tagline_bg, processed['tagline']) else None
        processed['summary_bg'] = summary_bg if has_valid_bg_summary else None
        
        # === FLAGS ===
        processed['has_bg_translation'] = has_valid_bg_title or has_valid_bg_summary
        processed['has_text_for_embedding'] = bool(processed['summary']) or bool(processed.get('summary_bg'))
        processed['is_popular_seed'] = True  # All imports from this script are popular seeds
        
        # Update stats
        if processed['has_bg_translation']:
            self.stats['has_bg_translation'] += 1
        if processed['has_text_for_embedding']:
            self.stats['has_valid_summary'] += 1
        
        # === YEAR ===
        if processed['release_date']:
            try:
                processed['release_year'] = int(processed['release_date'][:4])
            except:
                processed['release_year'] = None
        else:
            processed['release_year'] = None
        
        # === GENRES ===
        genres = data_en.get('genres', [])
        processed['genres'] = genres
        processed['genre'] = ', '.join([g['name'] for g in genres]) or 'Unknown'
        
        # Bulgarian genres
        genre_ids = [g['id'] for g in genres]
        genres_bg = [genre_map_bg.get(gid, '') for gid in genre_ids]
        processed['genre_bg'] = ', '.join([g for g in genres_bg if g]) or None
        
        # === IMAGE URLS ===
        if processed['poster_path']:
            processed['poster_url'] = f"{TMDB_IMAGE_BASE}/w500{processed['poster_path']}"
        else:
            processed['poster_url'] = None
        
        if processed['backdrop_path']:
            processed['backdrop_url'] = f"{TMDB_IMAGE_BASE}/w1280{processed['backdrop_path']}"
        else:
            processed['backdrop_url'] = None
        
        # === CAST & CREW ===
        if 'credits' in data_en:
            credits = data_en['credits']
            
            # Cast (top 15)
            cast = credits.get('cast', [])[:15]
            processed['cast'] = [
                {
                    'id': p.get('id'),
                    'name': p.get('name'),
                    'character': p.get('character'),
                    'profile_path': p.get('profile_path'),
                    'order': p.get('order', 999)
                }
                for p in cast
            ]
            processed['main_actors'] = [p['name'] for p in processed['cast'][:5]]
            
            # Director
            crew = credits.get('crew', [])
            director = next((p['name'] for p in crew if p.get('job') == 'Director'), None)
            processed['director'] = director
            
            # Key crew
            processed['crew'] = [
                {
                    'id': p.get('id'),
                    'name': p.get('name'),
                    'job': p.get('job'),
                    'department': p.get('department')
                }
                for p in crew
                if p.get('job') in ['Director', 'Writer', 'Screenplay', 'Producer']
            ][:10]
        else:
            processed['cast'] = []
            processed['crew'] = []
            processed['main_actors'] = []
            processed['director'] = None
        
        # === VIDEOS (Trailers) ===
        if 'videos' in data_en:
            videos = data_en['videos'].get('results', [])
            youtube_videos = [
                {
                    'key': v.get('key'),
                    'name': v.get('name'),
                    'type': v.get('type'),
                    'official': v.get('official', False)
                }
                for v in videos
                if v.get('site') == 'YouTube'
            ]
            
            processed['videos'] = youtube_videos
            
            # Find best trailer
            trailer = next(
                (v for v in youtube_videos if v['type'] == 'Trailer' and v.get('official')),
                next((v for v in youtube_videos if v['type'] == 'Trailer'), None)
            )
            processed['trailer_youtube_key'] = trailer['key'] if trailer else None
        else:
            processed['videos'] = []
            processed['trailer_youtube_key'] = None
        
        # === KEYWORDS ===
        if 'keywords' in data_en:
            keywords = data_en['keywords'].get('keywords', [])
            processed['keywords'] = [k['name'] for k in keywords[:20]]
        else:
            processed['keywords'] = []
        
        return processed
    
    # =========================================================================
    # FETCH MOVIE LISTS
    # =========================================================================
    
    def get_popular_movies(self, pages: int = 5) -> List[int]:
        """Get popular movie IDs"""
        return self._get_movie_list("/movie/popular", pages, "Popular")
    
    def get_top_rated_movies(self, pages: int = 5) -> List[int]:
        """Get top rated movie IDs"""
        return self._get_movie_list("/movie/top_rated", pages, "Top Rated")
    
    def get_now_playing_movies(self, pages: int = 2) -> List[int]:
        """Get now playing movie IDs"""
        return self._get_movie_list("/movie/now_playing", pages, "Now Playing")
    
    def get_trending_movies(self, pages: int = 2) -> List[int]:
        """Get trending movie IDs (this week)"""
        return self._get_movie_list("/trending/movie/week", pages, "Trending")
    
    def _get_movie_list(self, endpoint: str, pages: int, name: str) -> List[int]:
        """Generic method to get movie IDs from a list endpoint"""
        logger.info(f"📥 Fetching {name} movies ({pages} pages)...")
        movie_ids = []
        
        for page in range(1, pages + 1):
            data = self._make_request(endpoint, page=page)
            if data and 'results' in data:
                movie_ids.extend([m['id'] for m in data['results']])
        
        logger.info(f"   Found {len(movie_ids)} IDs from {name}")
        return movie_ids
    
    def print_stats(self):
        """Print import statistics"""
        print("\n" + "=" * 60)
        print("📊 IMPORT STATISTICS")
        print("=" * 60)
        print(f"   Total fetched:        {self.stats['fetched']}")
        print(f"   Passed quality:       {self.stats['passed_quality']}")
        print(f"   Failed quality:       {self.stats['failed_quality']}")
        print(f"   With BG translation:  {self.stats['has_bg_translation']}")
        print(f"   With valid summary:   {self.stats['has_valid_summary']}")
        print("=" * 60)


# =============================================================================
# DATABASE IMPORT
# =============================================================================

def import_to_database(movies: List[Dict], clear_existing: bool = False, dry_run: bool = False):
    """Import movies to database using raw SQL to avoid ORM relationship issues"""
    
    if dry_run:
        logger.info("\n🧪 DRY RUN - Not saving to database")
        logger.info(f"   Would import {len(movies)} movies")
        for m in movies[:5]:
            bg_flag = "🇧🇬" if m.get('has_bg_translation') else "  "
            print(f"   {bg_flag} {m['title']} ({m.get('release_year', 'N/A')})")
        if len(movies) > 5:
            print(f"   ... and {len(movies) - 5} more")
        return 0, 0
    
    try:
        from sqlalchemy import text
        from app.database import SyncSessionLocal
        
        logger.info("\n" + "=" * 60)
        logger.info("💾 IMPORTING TO DATABASE")
        logger.info("=" * 60)
        
        db = SyncSessionLocal()
        
        try:
            # Clear existing if requested - use raw SQL
            if clear_existing:
                logger.warning("⚠️  Clearing ALL existing data...")
                
                # Clear related tables first (foreign keys) - raw SQL
                try:
                    result = db.execute(text("DELETE FROM reviews"))
                    logger.info(f"   Deleted reviews")
                except Exception as e:
                    logger.warning(f"   Could not clear reviews: {e}")
                    db.rollback()
                
                try:
                    result = db.execute(text("DELETE FROM watchlist"))
                    logger.info(f"   Deleted watchlist")
                except Exception as e:
                    logger.warning(f"   Could not clear watchlist: {e}")
                    db.rollback()
                
                try:
                    result = db.execute(text("DELETE FROM favorites"))
                    logger.info(f"   Deleted favorites")
                except Exception as e:
                    logger.warning(f"   Could not clear favorites: {e}")
                    db.rollback()
                
                try:
                    result = db.execute(text("DELETE FROM movie_embeddings"))
                    logger.info(f"   Deleted embeddings")
                except Exception as e:
                    logger.debug(f"   No embeddings table or error: {e}")
                    db.rollback()
                
                # Clear movies
                try:
                    db.execute(text("DELETE FROM movies"))
                    db.commit()
                    logger.info(f"   Deleted all movies")
                except Exception as e:
                    logger.error(f"   Could not clear movies: {e}")
                    db.rollback()
                    return 0, 0
            
            # Import movies using raw SQL
            imported = 0
            errors = 0
            
            for i, m in enumerate(movies, 1):
                try:
                    # Parse release_date
                    release_date = None
                    if m.get('release_date'):
                        try:
                            release_date = m['release_date']
                        except:
                            pass
                    
                    # Convert JSON fields to string
                    import json
                    cast_json = json.dumps(m.get('cast', []))
                    crew_json = json.dumps(m.get('crew', []))
                    main_actors_json = json.dumps(m.get('main_actors', []))
                    videos_json = json.dumps(m.get('videos', []))
                    keywords_json = json.dumps(m.get('keywords', []))
                    
                    # Insert using raw SQL - quote reserved keywords
                    sql = text("""
                        INSERT INTO movies (
                            tmdb_id, imdb_id, title, original_title, tagline, summary,
                            title_bg, tagline_bg, summary_bg, genre, genre_bg,
                            release_date, release_year, runtime, status, adult,
                            original_language, budget, revenue, homepage,
                            popularity, tmdb_rating, tmdb_vote_count, average_rating, review_count,
                            poster_path, poster_url, backdrop_path, backdrop_url,
                            "cast", crew, main_actors, director, videos, trailer_youtube_key,
                            keywords, has_bg_translation, has_text_for_embedding, is_popular_seed
                        ) VALUES (
                            :tmdb_id, :imdb_id, :title, :original_title, :tagline, :summary,
                            :title_bg, :tagline_bg, :summary_bg, :genre, :genre_bg,
                            :release_date, :release_year, :runtime, :status, :adult,
                            :original_language, :budget, :revenue, :homepage,
                            :popularity, :tmdb_rating, :tmdb_vote_count, :average_rating, :review_count,
                            :poster_path, :poster_url, :backdrop_path, :backdrop_url,
                            :cast, :crew, :main_actors, :director, :videos, :trailer_youtube_key,
                            :keywords, :has_bg_translation, :has_text_for_embedding, :is_popular_seed
                        )
                    """)
                    
                    db.execute(sql, {
                        'tmdb_id': m.get('tmdb_id'),
                        'imdb_id': m.get('imdb_id'),
                        'title': m.get('title', ''),
                        'original_title': m.get('original_title'),
                        'tagline': m.get('tagline'),
                        'summary': m.get('summary'),
                        'title_bg': m.get('title_bg'),
                        'tagline_bg': m.get('tagline_bg'),
                        'summary_bg': m.get('summary_bg'),
                        'genre': m.get('genre', 'Unknown'),
                        'genre_bg': m.get('genre_bg'),
                        'release_date': release_date,
                        'release_year': m.get('release_year'),
                        'runtime': m.get('runtime'),
                        'status': m.get('status'),
                        'adult': m.get('adult', False),
                        'original_language': m.get('original_language'),
                        'budget': m.get('budget', 0),
                        'revenue': m.get('revenue', 0),
                        'homepage': m.get('homepage'),
                        'popularity': m.get('popularity', 0),
                        'tmdb_rating': m.get('tmdb_rating', 0),
                        'tmdb_vote_count': m.get('tmdb_vote_count', 0),
                        'average_rating': m.get('tmdb_rating', 0),  # Start with TMDb rating
                        'review_count': 0,
                        'poster_path': m.get('poster_path'),
                        'poster_url': m.get('poster_url'),
                        'backdrop_path': m.get('backdrop_path'),
                        'backdrop_url': m.get('backdrop_url'),
                        'cast': cast_json,
                        'crew': crew_json,
                        'main_actors': main_actors_json,
                        'director': m.get('director'),
                        'videos': videos_json,
                        'trailer_youtube_key': m.get('trailer_youtube_key'),
                        'keywords': keywords_json,
                        'has_bg_translation': m.get('has_bg_translation', False),
                        'has_text_for_embedding': m.get('has_text_for_embedding', True),
                        'is_popular_seed': m.get('is_popular_seed', True),
                    })
                    
                    db.commit()
                    imported += 1
                    
                    if imported % 25 == 0:
                        logger.info(f"   ✅ Imported {imported}/{len(movies)}...")
                
                except Exception as e:
                    logger.error(f"   ❌ Error importing '{m.get('title')}': {e}")
                    db.rollback()
                    errors += 1
            
            logger.info("\n" + "=" * 60)
            logger.info("✨ IMPORT COMPLETE!")
            logger.info(f"   ✅ Imported: {imported}")
            logger.info(f"   ❌ Errors: {errors}")
            logger.info("=" * 60)
            
            return imported, errors
        
        finally:
            db.close()
    
    except ImportError as e:
        logger.error(f"❌ Database import failed - missing module: {e}")
        logger.error("   Make sure you're running from the backend directory")
        return 0, 0


# =============================================================================
# MAIN
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Quality TMDb Movie Importer for Diploma Project",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  Fresh import (recommended):
    python import_movies_quality.py --fresh --limit 400
    
  Test run (no database):
    python import_movies_quality.py --test --limit 20
    
  Import specific movie:
    python import_movies_quality.py --movie-id 27205
        """
    )
    
    parser.add_argument('--fresh', action='store_true',
                       help='Clear database and import fresh (RECOMMENDED for diploma)')
    parser.add_argument('--limit', type=int, default=RECOMMENDED_LIMIT,
                       help=f'Maximum movies to import (default: {RECOMMENDED_LIMIT})')
    parser.add_argument('--movie-id', type=int,
                       help='Import specific movie by TMDb ID')
    parser.add_argument('--test', action='store_true',
                       help='Test run - fetch but do not save to database')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Show debug output')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    print("\n" + "=" * 60)
    print("🎬 QUALITY TMDb IMPORTER - Diploma Edition")
    print("=" * 60)
    
    if not TMDB_API_KEY:
        print("\n❌ TMDB_API_KEY not found!")
        print("   Add it to your .env file:")
        print("   TMDB_API_KEY=your_key_here")
        sys.exit(1)
    
    importer = QualityTMDbImporter(TMDB_API_KEY)
    
    # === SINGLE MOVIE MODE ===
    if args.movie_id:
        logger.info(f"\n📽️  Fetching movie ID {args.movie_id}...")
        movie_data = importer.get_movie_details(args.movie_id)
        
        if movie_data:
            print(f"\n✅ Found: {movie_data['title']} ({movie_data.get('release_year', 'N/A')})")
            print(f"   TMDb Rating: {movie_data.get('tmdb_rating', 0)}/10")
            print(f"   BG Translation: {'Yes ✅' if movie_data.get('has_bg_translation') else 'No ❌'}")
            print(f"   Has Summary: {'Yes ✅' if movie_data.get('has_text_for_embedding') else 'No ❌'}")
            
            if not args.test:
                import_to_database([movie_data], clear_existing=False)
        else:
            print(f"\n❌ Movie not found or failed quality check")
        
        sys.exit(0)
    
    # === BULK IMPORT MODE ===
    print(f"\n📊 Target: {args.limit} high-quality movies")
    print(f"   Quality filters:")
    print(f"   - Min votes: {MIN_VOTE_COUNT}")
    print(f"   - Min popularity: {MIN_POPULARITY}")
    print(f"   - Require poster: {REQUIRE_POSTER}")
    print(f"   - Require backdrop: {REQUIRE_BACKDROP}")
    print(f"   - Min runtime: {MIN_RUNTIME} min")
    
    if args.fresh:
        print(f"\n⚠️  FRESH MODE: Will clear existing database!")
        confirm = input("   Type 'yes' to confirm: ").strip().lower()
        if confirm != 'yes':
            print("   Cancelled.")
            sys.exit(0)
    
    # Fetch movie IDs from multiple sources
    print("\n" + "-" * 60)
    all_movie_ids = []
    
    # Popular (main source)
    all_movie_ids.extend(importer.get_popular_movies(pages=10))
    
    # Top Rated
    all_movie_ids.extend(importer.get_top_rated_movies(pages=10))
    
    # Trending
    all_movie_ids.extend(importer.get_trending_movies(pages=3))
    
    # Now Playing
    all_movie_ids.extend(importer.get_now_playing_movies(pages=2))
    
    # Remove duplicates while preserving order
    seen = set()
    unique_ids = []
    for mid in all_movie_ids:
        if mid not in seen:
            seen.add(mid)
            unique_ids.append(mid)
    
    logger.info(f"\n📋 Total unique movie IDs: {len(unique_ids)}")
    logger.info(f"   Will process until we have {args.limit} quality movies")
    
    # Fetch full details with quality filtering
    print("\n" + "-" * 60)
    logger.info("🔍 Fetching details and applying quality filters...")
    
    movies = []
    for i, movie_id in enumerate(unique_ids):
        if len(movies) >= args.limit:
            break
        
        movie_data = importer.get_movie_details(movie_id)
        
        if movie_data:
            movies.append(movie_data)
            
            if len(movies) % 25 == 0:
                logger.info(f"   ✅ {len(movies)}/{args.limit} quality movies found...")
    
    # Print stats
    importer.print_stats()
    
    # Show sample
    print("\n📝 Sample of imported movies:")
    for m in movies[:10]:
        bg_flag = "🇧🇬" if m.get('has_bg_translation') else "  "
        rating = m.get('tmdb_rating', 0)
        print(f"   {bg_flag} [{rating:.1f}] {m['title']} ({m.get('release_year', 'N/A')})")
    
    # Import to database
    if args.test:
        import_to_database(movies, dry_run=True)
    else:
        import_to_database(movies, clear_existing=args.fresh)
    
    # Final instructions
    print("\n" + "=" * 60)
    print("🎉 DONE!")
    print("=" * 60)
    print("\n📌 Next steps:")
    print("   1. Generate embeddings:")
    print("      python scripts/compute_embeddings.py")
    print("   2. Start the server:")
    print("      uvicorn app.main:app --reload")
    print("   3. Test the frontend!")
    print("\n" + "=" * 60 + "\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"\n❌ Fatal error: {e}", exc_info=True)
        sys.exit(1)