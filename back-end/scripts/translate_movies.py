#!/usr/bin/env python3
"""
Translate all movies to Bulgarian using Google Translate (FREE).

First install: pip install deep-translator

Run: 
    python scripts/translate_movies.py --stats     # Check progress
    python scripts/translate_movies.py --limit 10  # Test with 10 movies
    python scripts/translate_movies.py --all       # Translate ALL movies
"""
import sys
import time
import argparse
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import SessionLocal
from app.models.movie import Movie

# Check if deep-translator is installed
try:
    from deep_translator import GoogleTranslator
except ImportError:
    print("=" * 60)
    print("❌ ERROR: deep-translator not installed!")
    print("=" * 60)
    print("\nRun this command first:")
    print("  pip install deep-translator")
    print("=" * 60)
    sys.exit(1)


def translate_text(text: str, max_length: int = 4500) -> str:
    """Translate English to Bulgarian using Google Translate (free)"""
    if not text or not text.strip():
        return ""
    
    try:
        # Google has 5000 char limit
        text_to_translate = text[:max_length] if len(text) > max_length else text
        
        translator = GoogleTranslator(source='en', target='bg')
        result = translator.translate(text_to_translate)
        
        return result if result else ""
    
    except Exception as e:
        print(f"    ⚠️ Translation error: {e}")
        return ""


# Pre-defined genre translations (faster than API)
GENRE_TRANSLATIONS = {
    "action": "Екшън",
    "adventure": "Приключенски",
    "animation": "Анимация",
    "comedy": "Комедия",
    "crime": "Криминален",
    "documentary": "Документален",
    "drama": "Драма",
    "family": "Семеен",
    "fantasy": "Фентъзи",
    "history": "Исторически",
    "horror": "Хорър",
    "music": "Музикален",
    "mystery": "Мистерия",
    "romance": "Романтичен",
    "science fiction": "Научна фантастика",
    "sci-fi": "Научна фантастика",
    "thriller": "Трилър",
    "war": "Военен",
    "western": "Уестърн",
    "biography": "Биографичен",
    "sport": "Спортен",
    "musical": "Мюзикъл",
    "noir": "Ноар",
    "short": "Късометражен",
    "news": "Новини",
    "reality-tv": "Риалити",
    "talk-show": "Токшоу",
    "game-show": "Игрално шоу",
}


def translate_genre(genre: str) -> str:
    """Translate genre using dictionary (fast) or API (fallback)"""
    if not genre:
        return ""
    
    # Handle multiple genres (e.g., "Action, Comedy, Drama")
    if "," in genre:
        parts = [g.strip() for g in genre.split(",")]
        translated_parts = [translate_genre(p) for p in parts]
        return ", ".join([p for p in translated_parts if p])
    
    genre_lower = genre.lower().strip()
    
    # Try dictionary first (instant)
    if genre_lower in GENRE_TRANSLATIONS:
        return GENRE_TRANSLATIONS[genre_lower]
    
    # Fallback to API
    return translate_text(genre)


def translate_movies(limit: int = None, skip_existing: bool = True):
    """Translate all movies to Bulgarian"""
    
    print("\n" + "=" * 60)
    print("🇧🇬 TRANSLATING MOVIES TO BULGARIAN")
    print("=" * 60)
    print("Using: Google Translate (free, no API key needed)")
    print("=" * 60 + "\n")
    
    db = SessionLocal()
    
    try:
        # Get movies to translate
        query = db.query(Movie)
        
        if skip_existing:
            # Only get movies without Bulgarian title
            query = query.filter(
                (Movie.title_bg == None) | (Movie.title_bg == "")
            )
        
        if limit:
            query = query.limit(limit)
        
        movies = query.all()
        
        if not movies:
            print("✅ All movies already translated!")
            return
        
        print(f"📊 Found {len(movies)} movies to translate\n")
        
        translated = 0
        failed = 0
        
        for i, movie in enumerate(movies, 1):
            print(f"[{i}/{len(movies)}] {movie.title[:50]}...")
            
            try:
                # Translate title
                title_bg = translate_text(movie.title)
                if title_bg:
                    movie.title_bg = title_bg
                    print(f"    📝 Title: {title_bg[:50]}...")
                else:
                    print(f"    ⚠️ Title translation failed, keeping original")
                    movie.title_bg = movie.title
                
                # Translate genre (use dictionary - instant)
                genre_bg = translate_genre(movie.genre)
                if genre_bg:
                    movie.genre_bg = genre_bg
                    print(f"    📝 Genre: {genre_bg}")
                else:
                    movie.genre_bg = movie.genre
                
                # Translate summary
                if movie.summary:
                    summary_bg = translate_text(movie.summary)
                    if summary_bg:
                        movie.summary_bg = summary_bg
                        print(f"    📝 Summary: {summary_bg[:50]}...")
                    else:
                        movie.summary_bg = movie.summary
                
                db.commit()
                translated += 1
                
                # Rate limiting - be nice to free API (1 request per second)
                time.sleep(1.5)
                
            except Exception as e:
                print(f"    ❌ Error: {e}")
                db.rollback()
                failed += 1
                # Continue with next movie
                continue
        
        print("\n" + "=" * 60)
        print("✨ Translation complete!")
        print(f"    ✅ Translated: {translated}")
        print(f"    ❌ Failed: {failed}")
        print("=" * 60 + "\n")
        
    except KeyboardInterrupt:
        print("\n\n⚠️ Interrupted! Saving progress...")
        db.commit()
        print("Progress saved. Run again to continue.")
    
    finally:
        db.close()


def show_stats():
    """Show translation statistics"""
    db = SessionLocal()
    
    try:
        total = db.query(Movie).count()
        
        with_title_bg = db.query(Movie).filter(
            Movie.title_bg != None, 
            Movie.title_bg != ""
        ).count()
        
        with_summary_bg = db.query(Movie).filter(
            Movie.summary_bg != None, 
            Movie.summary_bg != ""
        ).count()
        
        with_genre_bg = db.query(Movie).filter(
            Movie.genre_bg != None, 
            Movie.genre_bg != ""
        ).count()
        
        print("\n" + "=" * 50)
        print("📊 TRANSLATION STATISTICS")
        print("=" * 50)
        print(f"Total movies:         {total}")
        print(f"With title_bg:        {with_title_bg} ({with_title_bg/total*100:.1f}%)")
        print(f"With summary_bg:      {with_summary_bg} ({with_summary_bg/total*100:.1f}%)")
        print(f"With genre_bg:        {with_genre_bg} ({with_genre_bg/total*100:.1f}%)")
        print(f"Need translation:     {total - with_title_bg}")
        print("=" * 50 + "\n")
        
        # Show sample
        sample = db.query(Movie).filter(Movie.title_bg != None).first()
        if sample:
            print("📽️ Sample translated movie:")
            print(f"   EN: {sample.title}")
            print(f"   BG: {sample.title_bg}")
            print(f"   Genre: {sample.genre} → {sample.genre_bg}")
            print()
        
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Translate movies to Bulgarian")
    parser.add_argument('--limit', type=int, help='Max movies to translate')
    parser.add_argument('--all', action='store_true', help='Translate all movies')
    parser.add_argument('--stats', action='store_true', help='Show statistics only')
    parser.add_argument('--force', action='store_true', help='Re-translate existing')
    
    args = parser.parse_args()
    
    if args.stats:
        show_stats()
    elif args.all:
        translate_movies(limit=None, skip_existing=not args.force)
        show_stats()
    elif args.limit:
        translate_movies(limit=args.limit, skip_existing=not args.force)
        show_stats()
    else:
        print("\n" + "=" * 60)
        print("🇧🇬 MOVIE TRANSLATOR")
        print("=" * 60)
        print("\nUsage:")
        print("  python scripts/translate_movies.py --stats      # Check progress")
        print("  python scripts/translate_movies.py --limit 10   # Test with 10")
        print("  python scripts/translate_movies.py --all        # Translate ALL")
        print("  python scripts/translate_movies.py --all --force  # Re-translate all")
        print("\nFirst time? Run --limit 10 to test!")
        print("=" * 60 + "\n")


if __name__ == "__main__":
    main()