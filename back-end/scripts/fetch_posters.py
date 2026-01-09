import sys
import os
import time
import argparse
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import requests
from app.database import SessionLocal
from app.models.movie import Movie

# TMDb API Configuration
TMDB_API_KEY = os.getenv("TMDB_API_KEY")
TMDB_SEARCH_URL = "https://api.themoviedb.org/3/search/movie"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"  # w500 = 500px wide

# Placeholder for movies without posters
PLACEHOLDER_POSTER = "https://via.placeholder.com/500x750?text=Няма+Постер"


def get_poster_url(movie_title: str, year: int = None) -> str | None:
    """
    Fetch poster URL from TMDb by movie title.
    
    Args:
        movie_title: Movie title to search for
        year: Optional release year for better matching
    
    Returns:
        Full poster URL or None if not found
    """
    if not TMDB_API_KEY:
        print("❌ TMDB_API_KEY not set in environment!")
        return None
    
    try:
        params = {
            "api_key": TMDB_API_KEY,
            "query": movie_title,
            "language": "en-US"  # Search in English for better results
        }
        
        if year:
            params["year"] = year
        
        response = requests.get(TMDB_SEARCH_URL, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if not data.get("results"):
            return None
        
        # Get first result (best match)
        poster_path = data["results"][0].get("poster_path")
        
        if not poster_path:
            return None
        
        return f"{TMDB_IMAGE_BASE}{poster_path}"
    
    except requests.RequestException as e:
        print(f"    ⚠️ API error: {e}")
        return None


def fetch_posters(limit: int = None, skip_existing: bool = True):
    """Fetch posters for all movies in database."""
    
    if not TMDB_API_KEY:
        print("\n" + "=" * 60)
        print("❌ ERROR: TMDB_API_KEY not found!")
        print("=" * 60)
        print("\nTo fix this:")
        print("1. Go to https://www.themoviedb.org/settings/api")
        print("2. Create a free account & get API key")
        print("3. Add to your .env file:")
        print("   TMDB_API_KEY=your_api_key_here")
        print("=" * 60 + "\n")
        return
    
    print("\n" + "=" * 60)
    print("🎬 FETCHING MOVIE POSTERS FROM TMDb")
    print("=" * 60)
    print("API: The Movie Database (TMDb)")
    print("License: Free for educational use")
    print("=" * 60 + "\n")
    
    db = SessionLocal()
    
    try:
        # Get movies to process
        query = db.query(Movie)
        
        if skip_existing:
            # Skip movies that already have a real poster (not placeholder)
            query = query.filter(
                (Movie.poster_url == None) | 
                (Movie.poster_url == "") |
                (Movie.poster_url.like("%placeholder%"))
            )
        
        if limit:
            query = query.limit(limit)
        
        movies = query.all()
        
        if not movies:
            print("✅ All movies already have posters!")
            return
        
        print(f"📊 Found {len(movies)} movies needing posters\n")
        
        found = 0
        not_found = 0
        errors = 0
        
        for i, movie in enumerate(movies, 1):
            print(f"[{i}/{len(movies)}] {movie.title[:50]}...")
            
            try:
                poster_url = get_poster_url(movie.title)
                
                if poster_url:
                    movie.poster_url = poster_url
                    db.commit()
                    found += 1
                    print(f"    ✅ Found: {poster_url[:50]}...")
                else:
                    # Set placeholder
                    movie.poster_url = PLACEHOLDER_POSTER
                    db.commit()
                    not_found += 1
                    print(f"    ⚠️ Not found, using placeholder")
                
                # Rate limiting - TMDb allows 40 requests/10 seconds
                time.sleep(0.3)
                
            except Exception as e:
                print(f"    ❌ Error: {e}")
                errors += 1
        
        print("\n" + "=" * 60)
        print("✨ Poster fetch complete!")
        print(f"    ✅ Found:     {found}")
        print(f"    ⚠️ Not found: {not_found}")
        print(f"    ❌ Errors:    {errors}")
        print("=" * 60 + "\n")
        
    except KeyboardInterrupt:
        print("\n\n⚠️ Interrupted! Saving progress...")
        db.commit()
    
    finally:
        db.close()


def show_stats():
    """Show poster statistics."""
    db = SessionLocal()
    
    try:
        total = db.query(Movie).count()
        with_poster = db.query(Movie).filter(
            Movie.poster_url != None,
            Movie.poster_url != "",
            ~Movie.poster_url.like("%placeholder%")
        ).count()
        with_placeholder = db.query(Movie).filter(
            Movie.poster_url.like("%placeholder%")
        ).count()
        no_poster = total - with_poster - with_placeholder
        
        print("\n" + "=" * 40)
        print("📊 POSTER STATISTICS")
        print("=" * 40)
        print(f"Total movies:        {total}")
        print(f"With TMDb poster:    {with_poster} ({with_poster/total*100:.1f}%)")
        print(f"With placeholder:    {with_placeholder}")
        print(f"Need poster:         {no_poster}")
        print("=" * 40 + "\n")
        
    finally:
        db.close()


def test_api():
    """Test TMDb API connection."""
    print("\n🔍 Testing TMDb API...")
    
    if not TMDB_API_KEY:
        print("❌ TMDB_API_KEY not set!")
        return False
    
    poster = get_poster_url("The Matrix")
    
    if poster:
        print(f"✅ API working! Test result:")
        print(f"   The Matrix → {poster}")
        return True
    else:
        print("❌ API test failed. Check your API key.")
        return False


def main():
    parser = argparse.ArgumentParser(description="Fetch movie posters from TMDb")
    parser.add_argument('--limit', type=int, help='Max movies to process')
    parser.add_argument('--all', action='store_true', help='Process all movies')
    parser.add_argument('--stats', action='store_true', help='Show statistics only')
    parser.add_argument('--test', action='store_true', help='Test API connection')
    parser.add_argument('--force', action='store_true', help='Re-fetch existing posters')
    
    args = parser.parse_args()
    
    if args.test:
        test_api()
    elif args.stats:
        show_stats()
    elif args.all:
        fetch_posters(limit=None, skip_existing=not args.force)
        show_stats()
    elif args.limit:
        fetch_posters(limit=args.limit, skip_existing=not args.force)
        show_stats()
    else:
        print("Usage:")
        print("  python scripts/fetch_posters.py --test          # Test API")
        print("  python scripts/fetch_posters.py --stats         # Show stats")
        print("  python scripts/fetch_posters.py --limit 50      # Fetch 50")
        print("  python scripts/fetch_posters.py --all           # Fetch all")
        print("  python scripts/fetch_posters.py --all --force   # Re-fetch all")


if __name__ == "__main__":
    main()