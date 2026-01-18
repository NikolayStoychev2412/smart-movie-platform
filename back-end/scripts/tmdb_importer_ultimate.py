#!/usr/bin/env python3
"""
ULTIMATE TMDb Movie Importer - WITH BULGARIAN TRANSLATIONS
===========================================================

Fetches EVERYTHING from TMDb including Bulgarian translations!

Features:
✅ Cast & Crew (actors, directors, writers)
✅ Videos (trailers, teasers, clips)
✅ Images (posters, backdrops - multiple sizes)
✅ Release dates, runtime, budget, revenue
✅ Production companies, countries, languages
✅ Collections (franchises)
✅ BULGARIAN TRANSLATIONS (official from TMDb!)
✅ Taglines in both languages

NO NEED for separate translation script!

Usage:
    # Import with Bulgarian translations
    python tmdb_importer_ultimate.py --popular --limit 100 --full-details
    
    # Import specific movie
    python tmdb_importer_ultimate.py --movie-id 27205 --full-details
    
    # Search and import
    python tmdb_importer_ultimate.py --search "Inception" --full-details
"""

import sys
import os
import time
import argparse
import logging
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime

# Add project root to path
project_root = Path(__file__).resolve().parent.parent if 'back-end' in str(Path.cwd()) else Path.cwd()
if 'back-end' not in str(project_root):
    project_root = project_root / 'back-end'
sys.path.insert(0, str(project_root))

import requests
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# TMDb Configuration
TMDB_API_KEY = os.getenv("TMDB_API_KEY")
TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"

REQUEST_DELAY = 0.25  # 4 requests per second


class UltimateTMDbImporter:
    """Import movies with EVERYTHING including Bulgarian translations"""
    
    def __init__(self, api_key: str):
        if not api_key:
            raise ValueError("TMDb API key required!")
        
        self.api_key = api_key
        self.session = requests.Session()
        self.session.params = {'api_key': self.api_key}
        
        # Cache for genre mapping
        self._genre_map_en = None
        self._genre_map_bg = None
    
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
    
    def get_genre_maps(self) -> tuple:
        """Get genre mappings for English and Bulgarian"""
        if self._genre_map_en and self._genre_map_bg:
            return self._genre_map_en, self._genre_map_bg
        
        # English genres
        data_en = self._make_request("/genre/movie/list", language="en-US")
        if data_en and 'genres' in data_en:
            self._genre_map_en = {g['id']: g['name'] for g in data_en['genres']}
        else:
            self._genre_map_en = {}
        
        # Bulgarian genres
        data_bg = self._make_request("/genre/movie/list", language="bg-BG")
        if data_bg and 'genres' in data_bg:
            self._genre_map_bg = {g['id']: g['name'] for g in data_bg['genres']}
        else:
            self._genre_map_bg = {}
        
        logger.info(f"📋 Loaded {len(self._genre_map_en)} genres (EN + BG)")
        
        return self._genre_map_en, self._genre_map_bg
    
    def get_movie_details(self, movie_id: int, full_details: bool = True) -> Optional[Dict]:
        """
        Get comprehensive movie details in BOTH English and Bulgarian.
        
        Makes 2 API calls:
        1. English version with credits, videos, images
        2. Bulgarian version for translations
        """
        logger.debug(f"Fetching details for movie {movie_id}...")
        
        # Get English version with all extras
        params_en = {'language': 'en-US'}
        if full_details:
            params_en['append_to_response'] = 'credits,videos,images,release_dates'
        
        data_en = self._make_request(f"/movie/{movie_id}", **params_en)
        
        if not data_en:
            return None
        
        # Get Bulgarian version for translations
        data_bg = self._make_request(f"/movie/{movie_id}", language='bg-BG')
        
        # Merge and process the data
        processed = self._process_movie_data(data_en, data_bg, full_details)
        
        return processed
    
    def _process_movie_data(self, data_en: Dict, data_bg: Optional[Dict], has_extra_data: bool = True) -> Dict:
        """Process and merge English + Bulgarian movie data"""
        
        # Start with English data
        processed = {
            'tmdb_id': data_en.get('id'),
            'imdb_id': data_en.get('imdb_id'),
            
            # English fields
            'title': data_en.get('title', ''),
            'original_title': data_en.get('original_title'),
            'tagline': data_en.get('tagline'),
            'summary': data_en.get('overview', ''),
            
            # Basic info
            'release_date': data_en.get('release_date'),
            'runtime': data_en.get('runtime'),
            'status': data_en.get('status'),
            'adult': data_en.get('adult', False),
            'budget': data_en.get('budget', 0),
            'revenue': data_en.get('revenue', 0),
            'homepage': data_en.get('homepage'),
            'original_language': data_en.get('original_language'),
            'popularity': data_en.get('popularity'),
            'tmdb_rating': data_en.get('vote_average'),
            'tmdb_vote_count': data_en.get('vote_count'),
        }
        
        # Add Bulgarian translations if available
        if data_bg:
            processed['title_bg'] = data_bg.get('title')
            processed['tagline_bg'] = data_bg.get('tagline')
            processed['summary_bg'] = data_bg.get('overview')
            
            # Log if we got translations
            if data_bg.get('title'):
                logger.debug(f"  🇧🇬 BG: {data_bg.get('title')}")
        else:
            processed['title_bg'] = None
            processed['tagline_bg'] = None
            processed['summary_bg'] = None
        
        # Extract year from release_date
        if processed['release_date']:
            try:
                processed['release_year'] = int(processed['release_date'][:4])
            except:
                processed['release_year'] = None
        else:
            processed['release_year'] = None
        
        # Process genres (English and Bulgarian)
        genre_map_en, genre_map_bg = self.get_genre_maps()
        
        genres_en = data_en.get('genres', [])
        processed['genres'] = genres_en
        
        # Genre string (English)
        processed['genre_string'] = ', '.join([g['name'] for g in genres_en])
        
        # Genre string (Bulgarian)
        genre_ids = [g['id'] for g in genres_en]
        genres_bg_names = [genre_map_bg.get(gid, genre_map_en.get(gid, '')) for gid in genre_ids]
        processed['genre_bg'] = ', '.join([g for g in genres_bg_names if g])
        
        # Process images
        processed['poster_path'] = data_en.get('poster_path')
        processed['backdrop_path'] = data_en.get('backdrop_path')
        
        if processed['poster_path']:
            processed['poster_url'] = f"{TMDB_IMAGE_BASE}{processed['poster_path']}"
        else:
            processed['poster_url'] = None
        
        if processed['backdrop_path']:
            processed['backdrop_url'] = f"{TMDB_IMAGE_BASE}{processed['backdrop_path']}"
        else:
            processed['backdrop_url'] = None
        
        # Process production details
        processed['production_companies'] = data_en.get('production_companies', [])
        processed['production_countries'] = data_en.get('production_countries', [])
        processed['spoken_languages'] = data_en.get('spoken_languages', [])
        processed['belongs_to_collection'] = data_en.get('belongs_to_collection')
        
        # Process cast & crew (if available)
        if has_extra_data and 'credits' in data_en:
            credits = data_en['credits']
            
            # Cast
            cast = credits.get('cast', [])[:20]  # Top 20 actors
            processed['cast'] = [
                {
                    'id': person.get('id'),
                    'name': person.get('name'),
                    'character': person.get('character'),
                    'profile_path': person.get('profile_path'),
                    'order': person.get('order', 999)
                }
                for person in cast
            ]
            
            # Main actors (top 5 names)
            processed['main_actors'] = [p['name'] for p in processed['cast'][:5]]
            
            # Crew
            crew = credits.get('crew', [])
            processed['crew'] = [
                {
                    'id': person.get('id'),
                    'name': person.get('name'),
                    'job': person.get('job'),
                    'department': person.get('department'),
                    'profile_path': person.get('profile_path')
                }
                for person in crew
                if person.get('department') in ['Directing', 'Writing', 'Production']
            ][:20]
            
            # Extract director
            director = next(
                (p['name'] for p in crew if p.get('job') == 'Director'),
                None
            )
            processed['director'] = director
        
        else:
            processed['cast'] = []
            processed['crew'] = []
            processed['main_actors'] = []
            processed['director'] = None
        
        # Process videos (if available)
        if has_extra_data and 'videos' in data_en:
            videos = data_en['videos'].get('results', [])
            
            # Filter for YouTube videos
            youtube_videos = [
                {
                    'id': v.get('id'),
                    'key': v.get('key'),
                    'name': v.get('name'),
                    'site': v.get('site'),
                    'type': v.get('type'),
                    'size': v.get('size'),
                    'official': v.get('official', False)
                }
                for v in videos
                if v.get('site') == 'YouTube'
            ]
            
            processed['videos'] = youtube_videos
            
            # Find main trailer
            trailer = next(
                (v for v in youtube_videos if v['type'] == 'Trailer' and v.get('official')),
                next((v for v in youtube_videos if v['type'] == 'Trailer'), None)
            )
            
            processed['trailer_youtube_key'] = trailer['key'] if trailer else None
        
        else:
            processed['videos'] = []
            processed['trailer_youtube_key'] = None
        
        # Timestamp
        processed['tmdb_last_updated'] = time.time()
        
        return processed
    
    def search_movies(self, query: str, page: int = 1) -> List[Dict]:
        """Search for movies by title"""
        logger.info(f"Searching for: {query}")
        
        data = self._make_request("/search/movie", query=query, page=page)
        
        if data and 'results' in data:
            return data['results']
        
        return []
    
    def get_popular_movies(self, pages: int = 1) -> List[int]:
        """Get popular movie IDs"""
        logger.info(f"Fetching popular movies ({pages} page(s))...")
        movie_ids = []
        
        for page in range(1, pages + 1):
            data = self._make_request("/movie/popular", page=page)
            if data and 'results' in data:
                movie_ids.extend([m['id'] for m in data['results']])
        
        return movie_ids
    
    def get_top_rated_movies(self, pages: int = 1) -> List[int]:
        """Get top rated movie IDs"""
        logger.info(f"Fetching top rated movies ({pages} page(s))...")
        movie_ids = []
        
        for page in range(1, pages + 1):
            data = self._make_request("/movie/top_rated", page=page)
            if data and 'results' in data:
                movie_ids.extend([m['id'] for m in data['results']])
        
        return movie_ids
    
    def get_now_playing_movies(self, pages: int = 1) -> List[int]:
        """Get now playing movie IDs"""
        logger.info(f"Fetching now playing movies ({pages} page(s))...")
        movie_ids = []
        
        for page in range(1, pages + 1):
            data = self._make_request("/movie/now_playing", page=page)
            if data and 'results' in data:
                movie_ids.extend([m['id'] for m in data['results']])
        
        return movie_ids
    
    def get_upcoming_movies(self, pages: int = 1) -> List[int]:
        """Get upcoming movie IDs"""
        logger.info(f"Fetching upcoming movies ({pages} page(s))...")
        movie_ids = []
        
        for page in range(1, pages + 1):
            data = self._make_request("/movie/upcoming", page=page)
            if data and 'results' in data:
                movie_ids.extend([m['id'] for m in data['results']])
        
        return movie_ids


def import_to_database(movies: List[Dict], clear_existing: bool = False):
    """Import movies with full data to database"""
    try:
        from app.database import SyncSessionLocal
        from app.models.movie import Movie
        from datetime import datetime as dt
        
        logger.info("\n" + "=" * 70)
        logger.info("💾 IMPORTING TO DATABASE (FULL DATA + BULGARIAN)")
        logger.info("=" * 70)
        
        db = SyncSessionLocal()
        
        try:
            if clear_existing:
                logger.warning("⚠️  Clearing all existing movies...")
                count = db.query(Movie).count()
                db.query(Movie).delete()
                db.commit()
                logger.info(f"   Deleted {count} existing movies")
            
            imported = 0
            updated = 0
            skipped = 0
            errors = 0
            with_bg = 0
            
            for i, movie_data in enumerate(movies, 1):
                try:
                    title = movie_data.get('title', '').strip()
                    tmdb_id = movie_data.get('tmdb_id')
                    
                    if not title or not tmdb_id:
                        skipped += 1
                        continue
                    
                    # Count Bulgarian translations
                    if movie_data.get('title_bg'):
                        with_bg += 1
                    
                    # Check if exists by TMDb ID
                    existing = db.query(Movie).filter(Movie.tmdb_id == tmdb_id).first()
                    
                    if existing:
                        # Update existing movie
                        for key, value in movie_data.items():
                            if hasattr(existing, key):
                                setattr(existing, key, value)
                        
                        # Update genre for backward compatibility
                        existing.genre = movie_data.get('genre_string', 'Unknown')
                        
                        # Update our rating to match TMDb initially
                        if movie_data.get('tmdb_rating'):
                            existing.average_rating = round(movie_data['tmdb_rating'] / 2, 1)
                        
                        db.commit()
                        updated += 1
                    
                    else:
                        # Create new movie
                        movie = Movie()
                        
                        for key, value in movie_data.items():
                            if hasattr(movie, key):
                                setattr(movie, key, value)
                        
                        # Set genre string for legacy compatibility
                        movie.genre = movie_data.get('genre_string', 'Unknown')
                        
                        # Set initial rating
                        if movie_data.get('tmdb_rating'):
                            movie.average_rating = round(movie_data['tmdb_rating'] / 2, 1)
                        else:
                            movie.average_rating = 0.0
                        
                        # Parse release_date if string
                        if isinstance(movie_data.get('release_date'), str):
                            try:
                                movie.release_date = dt.strptime(
                                    movie_data['release_date'], 
                                    '%Y-%m-%d'
                                ).date()
                            except:
                                movie.release_date = None
                        
                        db.add(movie)
                        db.commit()
                        db.refresh(movie)
                        
                        imported += 1
                    
                    if (imported + updated) % 10 == 0:
                        logger.info(f"✅ Progress: {imported} new, {updated} updated ({with_bg} with BG)")
                
                except Exception as e:
                    logger.error(f"Error with '{movie_data.get('title', 'unknown')}': {e}")
                    db.rollback()
                    errors += 1
                    continue
            
            logger.info("=" * 70)
            logger.info("✨ Import complete!")
            logger.info(f"   ✅ New: {imported}")
            logger.info(f"   🔄 Updated: {updated}")
            logger.info(f"   🇧🇬 With Bulgarian: {with_bg}/{imported + updated}")
            logger.info(f"   ⏭️  Skipped: {skipped}")
            logger.info(f"   ❌ Errors: {errors}")
            logger.info("=" * 70)
            
            return imported, updated, skipped, errors
        
        finally:
            db.close()
    
    except ImportError as e:
        logger.error(f"❌ Database import failed: {e}")
        return 0, 0, 0, 0


def main():
    parser = argparse.ArgumentParser(
        description="Ultimate TMDb importer with Bulgarian translations"
    )
    
    # Categories
    parser.add_argument('--popular', action='store_true', help='Import popular movies')
    parser.add_argument('--top-rated', action='store_true', help='Import top rated')
    parser.add_argument('--now-playing', action='store_true', help='Import now playing')
    parser.add_argument('--upcoming', action='store_true', help='Import upcoming')
    parser.add_argument('--all-categories', action='store_true', help='Import all')
    
    # Specific movie
    parser.add_argument('--movie-id', type=int, help='Import specific movie by TMDb ID')
    parser.add_argument('--search', type=str, help='Search and import by title')
    
    # Options
    parser.add_argument('--limit', type=int, default=100, help='Max per category')
    parser.add_argument('--clear', action='store_true', help='Clear existing movies')
    parser.add_argument('--full-details', action='store_true', 
                       help='Fetch cast, crew, videos (RECOMMENDED!)')
    parser.add_argument('--test', action='store_true', help='Test API connection')
    
    args = parser.parse_args()
    
    print("\n" + "=" * 70)
    print("🎬 ULTIMATE TMDb IMPORTER - With Bulgarian Translations!")
    print("=" * 70 + "\n")
    
    if not TMDB_API_KEY:
        print("❌ TMDB_API_KEY not found!")
        print("Add it to your .env file")
        sys.exit(1)
    
    importer = UltimateTMDbImporter(TMDB_API_KEY)
    
    # Test mode
    if args.test:
        data = importer._make_request("/movie/popular", page=1)
        if data:
            print("✅ API working!")
            print(f"Sample: {data['results'][0]['title']}")
        sys.exit(0)
    
    # Import specific movie
    if args.movie_id:
        logger.info(f"Fetching movie ID {args.movie_id}...")
        movie_data = importer.get_movie_details(args.movie_id, args.full_details)
        
        if movie_data:
            import_to_database([movie_data], False)
        else:
            logger.error("Failed to fetch movie")
        
        sys.exit(0)
    
    # Search mode
    if args.search:
        results = importer.search_movies(args.search)
        
        if not results:
            print(f"No results for '{args.search}'")
            sys.exit(0)
        
        print(f"\nFound {len(results)} results:\n")
        for i, movie in enumerate(results[:10], 1):
            print(f"{i}. {movie['title']} ({movie.get('release_date', 'N/A')[:4]})")
        
        choice = input("\nImport which? (number or 'all'): ").strip()
        
        if choice == 'all':
            to_import = results[:args.limit]
        else:
            try:
                idx = int(choice) - 1
                to_import = [results[idx]]
            except:
                print("Invalid choice")
                sys.exit(1)
        
        # Fetch full details
        movies = []
        for movie in to_import:
            data = importer.get_movie_details(movie['id'], args.full_details)
            if data:
                movies.append(data)
        
        import_to_database(movies, False)
        sys.exit(0)
    
    # Category import
    if not any([args.popular, args.top_rated, args.now_playing, args.upcoming, args.all_categories]):
        print("❌ Specify a category or use --help")
        sys.exit(1)
    
    # Fetch movie IDs
    movies_per_page = 20
    pages = (args.limit + movies_per_page - 1) // movies_per_page
    
    movie_ids = []
    
    if args.all_categories or args.popular:
        movie_ids.extend(importer.get_popular_movies(pages))
    
    if args.all_categories or args.top_rated:
        movie_ids.extend(importer.get_top_rated_movies(pages))
    
    if args.all_categories or args.now_playing:
        movie_ids.extend(importer.get_now_playing_movies(pages))
    
    if args.all_categories or args.upcoming:
        movie_ids.extend(importer.get_upcoming_movies(pages))
    
    # Remove duplicates
    movie_ids = list(set(movie_ids))[:args.limit]
    
    logger.info(f"\n📊 Fetching full details for {len(movie_ids)} movies...")
    logger.info(f"   Full details: {'YES ✅' if args.full_details else 'NO ⚠️'}")
    logger.info(f"   Bulgarian: YES ✅ (automatic!)")
    
    if not args.full_details:
        logger.warning("\n⚠️  Running without --full-details")
        logger.warning("   You won't get cast, crew, or videos!")
        logger.warning("   Add --full-details for complete data\n")
    
    # Fetch full details
    movies = []
    for i, movie_id in enumerate(movie_ids, 1):
        if i % 10 == 0:
            logger.info(f"   Fetching {i}/{len(movie_ids)}...")
        
        data = importer.get_movie_details(movie_id, args.full_details)
        if data:
            movies.append(data)
    
    # Import
    import_to_database(movies, args.clear)
    
    print("\n" + "=" * 70)
    print("🎉 DONE!")
    print("=" * 70)
    print("\n✅ Movies imported with Bulgarian translations!")
    print("✅ No need to run translate_movies.py!")
    print("\nNext steps:")
    print("1. Embeddings: python scripts/compute_embeddings.py")
    print("2. Start server: uvicorn app.main:app --reload")
    print("\n" + "=" * 70 + "\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted. Exiting...")
        sys.exit(1)
    except Exception as e:
        logger.error(f"\n❌ Fatal error: {e}", exc_info=True)
        sys.exit(1)