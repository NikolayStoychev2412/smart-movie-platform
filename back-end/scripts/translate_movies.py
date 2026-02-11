#!/usr/bin/env python3
"""
Translate all movies to Bulgarian.

Strategy (best quality first):
  1. TMDb API -- official Bulgarian translations (highest quality)
  2. MyMemory API -- free, no API key, GET requests only
  3. LibreTranslate -- free, open-source, no API key needed
  4. Genre dictionary -- instant, hardcoded mapping

No extra packages needed -- uses only requests (already installed).

Run:
    python scripts/translate_movies.py --stats        # Check progress
    python scripts/translate_movies.py --limit 10     # Test with 10 movies
    python scripts/translate_movies.py --all          # Translate ALL movies
    python scripts/translate_movies.py --all --force  # Re-translate everything
    python scripts/translate_movies.py --audit        # Check quality
    python scripts/translate_movies.py --audit --fix  # Fix bad translations
"""
import sys
import os
import re
import time
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
load_dotenv()

import requests
from sqlalchemy import or_
from app.database import SyncSessionLocal
from app.models.movie import Movie

# TMDb setup
TMDB_API_KEY = os.getenv("TMDB_API_KEY")
TMDB_BASE_URL = "https://api.themoviedb.org/3"

# LibreTranslate (free, no API key)
LIBRE_ENDPOINTS = [
    "https://libretranslate.de",
    "https://translate.argosopentech.com",
    "https://libretranslate.com",
]
_libre_url = None
_libre_works = None


def _find_libre_endpoint():
    """Find a working LibreTranslate endpoint that actually translates."""
    global _libre_url, _libre_works
    if _libre_url and _libre_works:
        return _libre_url
    if _libre_works is False:
        return None

    for url in LIBRE_ENDPOINTS:
        try:
            r = requests.get(f"{url}/languages", timeout=5)
            if r.status_code != 200:
                continue
            langs = [l.get('code') for l in r.json()]
            if 'bg' not in langs:
                continue

            test = requests.post(
                f"{url}/translate",
                json={"q": "Hello", "source": "en", "target": "bg", "format": "text"},
                timeout=10,
            )
            if test.status_code == 200 and test.json().get("translatedText"):
                _libre_url = url
                _libre_works = True
                print(f"  LibreTranslate: {url} (verified working)")
                return _libre_url
            else:
                print(f"  LibreTranslate: {url} responded {test.status_code} (skipping)")
        except Exception:
            continue

    _libre_works = False
    print("  LibreTranslate: no working endpoint found")
    print("  MyMemory API: available (free fallback)")
    return None


def libre_translate(text: str) -> str:
    """Translate EN->BG via LibreTranslate (free). Returns '' on failure."""
    if not text or not text.strip():
        return ""
    url = _find_libre_endpoint()
    if not url:
        return ""
    try:
        r = requests.post(
            f"{url}/translate",
            json={
                "q": text[:4500],
                "source": "en",
                "target": "bg",
                "format": "text",
            },
            timeout=30,
        )
        if r.status_code == 200:
            return r.json().get("translatedText", "")
        if r.status_code == 429:
            time.sleep(2)
            r2 = requests.post(
                f"{url}/translate",
                json={"q": text[:4500], "source": "en", "target": "bg", "format": "text"},
                timeout=30,
            )
            if r2.status_code == 200:
                return r2.json().get("translatedText", "")
        return ""
    except Exception:
        return ""


# MyMemory API (free, no API key, GET requests)
MYMEMORY_URL = "https://api.mymemory.translated.net/get"


def mymemory_translate(text: str) -> str:
    """Translate EN->BG via MyMemory (free, no key). Returns '' on failure."""
    if not text or not text.strip():
        return ""
    try:
        chunk = text[:500]
        r = requests.get(
            MYMEMORY_URL,
            params={"q": chunk, "langpair": "en|bg"},
            timeout=15,
        )
        if r.status_code == 200:
            data = r.json()
            translated = data.get("responseData", {}).get("translatedText", "")
            if translated and translated.lower() != chunk.lower():
                return translated
        return ""
    except Exception:
        return ""


def mymemory_translate_long(text: str) -> str:
    """Translate longer text via MyMemory by splitting into chunks."""
    if not text or not text.strip():
        return ""
    if len(text) <= 500:
        return mymemory_translate(text)
    sentences = re.split(r'(?<=[.!?])\s+', text)
    chunks = []
    current = ""
    for s in sentences:
        if len(current) + len(s) + 1 > 500:
            if current:
                chunks.append(current)
            current = s
        else:
            current = f"{current} {s}".strip() if current else s
    if current:
        chunks.append(current)
    translated_parts = []
    for chunk in chunks:
        result = mymemory_translate(chunk)
        if result:
            translated_parts.append(result)
        else:
            return ""
        time.sleep(0.5)
    return " ".join(translated_parts)


# Validation
CYRILLIC_RE = re.compile(r'[А-Яа-яЁёЪъ]')
FOREIGN_RE = re.compile(
    r'[\u3040-\u309F'    # Hiragana
    r'\u30A0-\u30FF'     # Katakana
    r'\u4E00-\u9FFF'     # CJK (Chinese/Japanese)
    r'\uAC00-\uD7AF'     # Korean Hangul
    r'\u0600-\u06FF'     # Arabic
    r'\u0900-\u097F'     # Devanagari (Hindi)
    r'\u0B80-\u0BFF'     # Tamil
    r'\u0E00-\u0E7F'     # Thai
    r'\u0A80-\u0AFF'     # Gujarati
    r'\u0C00-\u0C7F'     # Telugu
    r'\u0C80-\u0CFF'     # Kannada
    r']'
)


def _is_valid_bg(text_bg: str | None, text_en: str | None) -> bool:
    """Return True only if text_bg is a genuine Bulgarian translation."""
    if not text_bg or not text_bg.strip():
        return False
    bg = text_bg.strip()
    en = (text_en or '').strip()
    if bg.lower() == en.lower():
        return False
    if FOREIGN_RE.search(bg):
        return False
    return True


# Genre translations (instant, no API call)
GENRE_MAP = {
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
    "tv movie": "Телевизионен филм",
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
    """Translate genre string using hardcoded map, fallback to LibreTranslate."""
    if not genre:
        return ""
    if "," in genre:
        parts = [g.strip() for g in genre.split(",")]
        return ", ".join(translate_genre(p) for p in parts if p)
    key = genre.lower().strip()
    if key in GENRE_MAP:
        return GENRE_MAP[key]
    result = libre_translate(genre) or mymemory_translate(genre)
    return result or genre


# TMDb fetcher
_tmdb_session = None
_tmdb_genre_map_bg = None


def _get_tmdb_session():
    global _tmdb_session
    if _tmdb_session is None and TMDB_API_KEY:
        _tmdb_session = requests.Session()
        _tmdb_session.params = {'api_key': TMDB_API_KEY}
    return _tmdb_session


def _get_tmdb_genre_map_bg() -> dict:
    """Fetch TMDb genre ID -> Bulgarian name map (cached)."""
    global _tmdb_genre_map_bg
    if _tmdb_genre_map_bg is not None:
        return _tmdb_genre_map_bg
    s = _get_tmdb_session()
    if not s:
        _tmdb_genre_map_bg = {}
        return _tmdb_genre_map_bg
    try:
        time.sleep(0.25)
        r = s.get(f"{TMDB_BASE_URL}/genre/movie/list", params={'language': 'bg-BG'})
        r.raise_for_status()
        _tmdb_genre_map_bg = {g['id']: g['name'] for g in r.json().get('genres', [])}
    except Exception:
        _tmdb_genre_map_bg = {}
    return _tmdb_genre_map_bg


def fetch_tmdb_bg(tmdb_id: int) -> dict | None:
    """Fetch Bulgarian title/summary/tagline from TMDb for a movie."""
    s = _get_tmdb_session()
    if not s or not tmdb_id:
        return None
    try:
        time.sleep(0.25)
        r = s.get(f"{TMDB_BASE_URL}/movie/{tmdb_id}", params={'language': 'bg-BG'})
        r.raise_for_status()
        data = r.json()
        return {
            'title_bg': (data.get('title') or '').strip(),
            'summary_bg': (data.get('overview') or '').strip(),
            'tagline_bg': (data.get('tagline') or '').strip(),
            'genres': data.get('genres', []),
        }
    except Exception:
        return None


# Main translation logic

def needs_translation(movie: Movie) -> bool:
    """Check if any bg field is missing."""
    if not movie.title_bg or not movie.title_bg.strip():
        return True
    if movie.summary and (not movie.summary_bg or not movie.summary_bg.strip()):
        return True
    if movie.genre and (not movie.genre_bg or not movie.genre_bg.strip()):
        return True
    if movie.tagline and (not movie.tagline_bg or not (movie.tagline_bg or '').strip()):
        return True
    return False


def _translate_text(text: str, long: bool = False) -> str:
    """Try all translation sources: LibreTranslate -> MyMemory. Returns '' on failure."""
    if not text or not text.strip():
        return ""
    result = libre_translate(text)
    if result and _is_valid_bg(result, text):
        return result
    if long:
        result = mymemory_translate_long(text)
    else:
        result = mymemory_translate(text)
    if result and _is_valid_bg(result, text):
        return result
    return ""


def translate_single(movie: Movie) -> dict:
    """
    Translate a single movie. Returns dict of updated fields.

    Strategy:
      1. TMDb API (official, highest quality)
      2. LibreTranslate (free fallback)
      3. MyMemory API (free, no key)
      4. Genre dictionary (instant)
      5. English fallback (last resort)
    """
    updated = {}
    title_en = movie.title or ''
    summary_en = movie.summary or ''
    tagline_en = movie.tagline or ''
    genre_en = movie.genre or ''

    tmdb_data = fetch_tmdb_bg(movie.tmdb_id) if movie.tmdb_id else None

    # Title
    if not movie.title_bg or not movie.title_bg.strip():
        title_bg = None
        if tmdb_data and _is_valid_bg(tmdb_data['title_bg'], title_en):
            title_bg = tmdb_data['title_bg']
        if not title_bg:
            title_bg = _translate_text(title_en)
        if not title_bg and title_en:
            title_bg = title_en
        if title_bg:
            updated['title_bg'] = title_bg

    # Summary
    if summary_en and (not movie.summary_bg or not movie.summary_bg.strip()):
        summary_bg = None
        if tmdb_data and _is_valid_bg(tmdb_data['summary_bg'], summary_en):
            summary_bg = tmdb_data['summary_bg']
        if not summary_bg:
            summary_bg = _translate_text(summary_en, long=True)
        if not summary_bg and summary_en:
            summary_bg = summary_en
        if summary_bg:
            updated['summary_bg'] = summary_bg

    # Tagline
    if tagline_en and (not movie.tagline_bg or not (movie.tagline_bg or '').strip()):
        tagline_bg = None
        if tmdb_data and _is_valid_bg(tmdb_data['tagline_bg'], tagline_en):
            tagline_bg = tmdb_data['tagline_bg']
        if not tagline_bg:
            tagline_bg = _translate_text(tagline_en)
        if not tagline_bg and tagline_en:
            tagline_bg = tagline_en
        if tagline_bg:
            updated['tagline_bg'] = tagline_bg

    # Genre (TMDb bg genres -> dictionary -> LibreTranslate)
    if genre_en and (not movie.genre_bg or not movie.genre_bg.strip()):
        genre_bg = None
        if tmdb_data and tmdb_data.get('genres'):
            bg_genre_map = _get_tmdb_genre_map_bg()
            if bg_genre_map:
                bg_names = [bg_genre_map.get(g['id'], '') for g in tmdb_data['genres']]
                bg_names = [n for n in bg_names if n]
                if bg_names:
                    genre_bg = ', '.join(bg_names)
        if not genre_bg:
            genre_bg = translate_genre(genre_en)
        if genre_bg:
            updated['genre_bg'] = genre_bg

    # Update has_bg_translation flag
    final_title_bg = updated.get('title_bg', movie.title_bg)
    final_summary_bg = updated.get('summary_bg', movie.summary_bg)
    has_bg = bool(final_title_bg and final_title_bg.strip()) or bool(final_summary_bg and final_summary_bg.strip())
    if has_bg != movie.has_bg_translation:
        updated['has_bg_translation'] = has_bg

    return updated


# Batch runner

def translate_movies(limit: int = None, skip_existing: bool = True):
    """Translate movies to Bulgarian."""

    print("\nTranslating movies to Bulgarian")
    if TMDB_API_KEY:
        print("  TMDb API: available (primary source)")
    else:
        print("  TMDb API: not available")
    _find_libre_endpoint()
    print()

    db = SyncSessionLocal()

    try:
        query = db.query(Movie)

        if skip_existing:
            query = query.filter(
                or_(
                    Movie.title_bg == None,
                    Movie.title_bg == "",
                    Movie.summary_bg == None,
                    Movie.summary_bg == "",
                    Movie.genre_bg == None,
                    Movie.genre_bg == "",
                    Movie.tagline_bg == None,
                    Movie.tagline_bg == "",
                )
            )

        movies = query.all() if not limit else query.limit(limit).all()

        if skip_existing:
            movies = [m for m in movies if needs_translation(m)]

        if not movies:
            print("All movies already translated.")
            return

        print(f"Found {len(movies)} movies to translate\n")

        translated = 0
        failed = 0

        for i, movie in enumerate(movies, 1):
            missing = []
            if not movie.title_bg or not movie.title_bg.strip():
                missing.append("title")
            if movie.summary and (not movie.summary_bg or not movie.summary_bg.strip()):
                missing.append("summary")
            if movie.genre and (not movie.genre_bg or not movie.genre_bg.strip()):
                missing.append("genre")
            if movie.tagline and (not movie.tagline_bg or not (movie.tagline_bg or '').strip()):
                missing.append("tagline")

            print(f"[{i}/{len(movies)}] {movie.title[:45]}  (need: {', '.join(missing or ['?'])})", end="")

            try:
                updated = translate_single(movie)

                if not updated:
                    print(" -> ok")
                    continue

                for key, val in updated.items():
                    setattr(movie, key, val)

                db.commit()
                translated += 1

                fields = [k for k in updated if k != 'has_bg_translation']
                print(f" -> {', '.join(fields)}")

                if 'title_bg' in updated:
                    print(f"    = {updated['title_bg'][:60]}")

            except Exception as e:
                print(f" ERROR: {e}")
                db.rollback()
                failed += 1
                continue

        print(f"\nTranslation complete: {translated} translated, {failed} failed, "
              f"{len(movies) - translated - failed} skipped")

    except KeyboardInterrupt:
        print("\n\nInterrupted. Saving progress...")
        db.commit()
        print("Progress saved. Run again to continue.")

    finally:
        db.close()


def show_stats():
    """Show translation statistics."""
    db = SyncSessionLocal()

    try:
        total = db.query(Movie).count()
        if total == 0:
            print("\nNo movies in database.")
            return

        with_title = db.query(Movie).filter(Movie.title_bg != None, Movie.title_bg != "").count()
        with_summary = db.query(Movie).filter(Movie.summary_bg != None, Movie.summary_bg != "").count()
        with_genre = db.query(Movie).filter(Movie.genre_bg != None, Movie.genre_bg != "").count()
        with_tagline = db.query(Movie).filter(Movie.tagline_bg != None, Movie.tagline_bg != "").count()
        with_tmdb_id = db.query(Movie).filter(Movie.tmdb_id != None).count()

        pct = lambda n: f"{n/total*100:.0f}%"

        print(f"\nTranslation statistics:")
        print(f"  Total movies:        {total}")
        print(f"  With tmdb_id:        {with_tmdb_id} ({pct(with_tmdb_id)})")
        print(f"  title_bg:            {with_title} / {total}  ({pct(with_title)})")
        print(f"  summary_bg:          {with_summary} / {total}  ({pct(with_summary)})")
        print(f"  genre_bg:            {with_genre} / {total}  ({pct(with_genre)})")
        print(f"  tagline_bg:          {with_tagline} / {total}  ({pct(with_tagline)})")
        print(f"  Need translation:    {total - with_title}")

        sample = db.query(Movie).filter(Movie.title_bg != None, Movie.title_bg != "").first()
        if sample:
            print(f"\n  Sample: {sample.title}")
            print(f"     BG:  {sample.title_bg}")
            if sample.genre_bg:
                print(f"     Genre: {sample.genre} -> {sample.genre_bg}")
            print()

    finally:
        db.close()


def audit_movies(fix: bool = False):
    """
    Audit ALL movies for translation quality issues.

    Checks:
      1. title_bg same as English (not translated, just fallback)
      2. title_bg has no Cyrillic (foreign language or Latin-only)
      3. title_bg has CJK/Arabic/etc. characters
      4. Missing English summary (no source text)
      5. Missing Bulgarian summary (not translated)
      6. summary_bg same as English (not translated)
      7. Missing genre_bg

    With --fix: clears bad fields and re-translates via TMDb/LibreTranslate.
    """
    print("\nAudit: checking all movies for translation quality\n")

    if fix:
        print("  Mode: AUDIT + FIX (will re-translate problematic movies)")
        if TMDB_API_KEY:
            print("  TMDb API: available")
        _find_libre_endpoint()
    else:
        print("  Mode: REPORT ONLY (use --fix to auto-fix issues)")
    print()

    db = SyncSessionLocal()

    try:
        movies = db.query(Movie).order_by(Movie.id).all()
        total = len(movies)
        print(f"Checking {total} movies...\n")

        issues = {
            'title_same_as_en': [],
            'title_no_cyrillic': [],
            'title_foreign_chars': [],
            'title_missing': [],
            'summary_en_missing': [],
            'summary_bg_missing': [],
            'summary_same_as_en': [],
            'genre_bg_missing': [],
        }

        for movie in movies:
            title_en = (movie.title or '').strip()
            title_bg = (movie.title_bg or '').strip()
            summary_en = (movie.summary or '').strip()
            summary_bg = (movie.summary_bg or '').strip()
            genre_en = (movie.genre or '').strip()
            genre_bg = (movie.genre_bg or '').strip()

            if not title_bg:
                issues['title_missing'].append(movie)
            elif title_bg.lower() == title_en.lower():
                issues['title_same_as_en'].append(movie)
            elif FOREIGN_RE.search(title_bg):
                issues['title_foreign_chars'].append(movie)
            elif not CYRILLIC_RE.search(title_bg):
                issues['title_no_cyrillic'].append(movie)

            if not summary_en:
                issues['summary_en_missing'].append(movie)
            elif not summary_bg:
                issues['summary_bg_missing'].append(movie)
            elif summary_bg.lower() == summary_en.lower():
                issues['summary_same_as_en'].append(movie)

            if genre_en and not genre_bg:
                issues['genre_bg_missing'].append(movie)

        total_issues = sum(len(v) for v in issues.values())

        labels = {
            'title_missing': 'TITLE BG MISSING (empty)',
            'title_same_as_en': 'TITLE BG = ENGLISH (not translated)',
            'title_no_cyrillic': 'TITLE BG NO CYRILLIC (Latin-only)',
            'title_foreign_chars': 'TITLE BG FOREIGN CHARS (CJK/Arabic/etc.)',
            'summary_en_missing': 'SUMMARY EN MISSING (no source)',
            'summary_bg_missing': 'SUMMARY BG MISSING',
            'summary_same_as_en': 'SUMMARY BG = ENGLISH (not translated)',
            'genre_bg_missing': 'GENRE BG MISSING',
        }

        for key, label in labels.items():
            group = issues[key]
            if not group:
                print(f"  [OK] {label}: 0")
                continue

            print(f"\n  [!!] {label}: {len(group)}")
            for m in group[:15]:
                title_bg_show = (m.title_bg or '(empty)')[:50]
                print(f"       id={m.id:4d}  {m.title[:35]:<36s} -> {title_bg_show}")
            if len(group) > 15:
                print(f"       ... and {len(group) - 15} more")

        print(f"\nTotal issues: {total_issues} across {total} movies")
        ok_count = total - len(set(m.id for v in issues.values() for m in v))
        print(f"Clean movies: {ok_count} / {total}")

        if not fix:
            if total_issues > 0:
                print(f"\n  Run with --audit --fix to auto-fix these issues.\n")
            return

        # Collect all movies that need fixing
        to_fix = set()
        clear_fields = {}

        for m in issues['title_missing'] + issues['title_foreign_chars']:
            to_fix.add(m.id)
            clear_fields.setdefault(m.id, set()).add('title_bg')

        for m in issues['title_same_as_en']:
            to_fix.add(m.id)
            clear_fields.setdefault(m.id, set()).add('title_bg')

        for m in issues['title_no_cyrillic']:
            to_fix.add(m.id)
            clear_fields.setdefault(m.id, set()).add('title_bg')

        for m in issues['summary_bg_missing']:
            to_fix.add(m.id)
            clear_fields.setdefault(m.id, set()).add('summary_bg')

        for m in issues['summary_same_as_en']:
            to_fix.add(m.id)
            clear_fields.setdefault(m.id, set()).add('summary_bg')

        for m in issues['genre_bg_missing']:
            to_fix.add(m.id)
            clear_fields.setdefault(m.id, set()).add('genre_bg')

        if not to_fix:
            print("\n  Nothing to fix.")
            return

        print(f"\n  Fixing {len(to_fix)} movies...\n")

        fixed = 0
        still_bad = 0

        for movie in movies:
            if movie.id not in to_fix:
                continue

            fields_to_clear = clear_fields.get(movie.id, set())
            for field in fields_to_clear:
                setattr(movie, field, None)

            print(f"  [{movie.id}] {movie.title[:45]:<46s}", end="")

            try:
                updated = translate_single(movie)

                if updated:
                    for key, val in updated.items():
                        setattr(movie, key, val)
                    db.commit()

                    new_title_bg = (movie.title_bg or '').strip()
                    title_en = (movie.title or '').strip()
                    got_cyrillic = CYRILLIC_RE.search(new_title_bg) if new_title_bg else False

                    if 'title_bg' in fields_to_clear:
                        if new_title_bg and new_title_bg.lower() != title_en.lower() and got_cyrillic:
                            status = "FIXED"
                        elif new_title_bg and new_title_bg.lower() != title_en.lower():
                            status = "updated (no Cyrillic)"
                        elif new_title_bg:
                            status = "kept English"
                        else:
                            status = "still empty"
                    else:
                        status = "FIXED"

                    fields = [k for k in updated if k != 'has_bg_translation']
                    print(f" -> {status} ({', '.join(fields)})")
                    if 'title_bg' in updated:
                        print(f"       = {updated['title_bg'][:60]}")
                    fixed += 1
                else:
                    print(f" -> no change")
                    still_bad += 1

            except Exception as e:
                print(f" -> ERROR: {e}")
                db.rollback()
                still_bad += 1

        print(f"\nFix complete: {fixed} fixed, {still_bad} still need attention\n")

    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(
        description="Translate movies to Bulgarian (TMDb + LibreTranslate)"
    )
    parser.add_argument('--limit', type=int, help='Max movies to translate')
    parser.add_argument('--all', action='store_true', help='Translate all movies')
    parser.add_argument('--stats', action='store_true', help='Show statistics only')
    parser.add_argument('--force', action='store_true', help='Re-translate existing')
    parser.add_argument('--audit', action='store_true', help='Audit translation quality')
    parser.add_argument('--fix', action='store_true', help='Fix issues found by --audit')

    args = parser.parse_args()

    if args.audit:
        audit_movies(fix=args.fix)
        show_stats()
    elif args.stats:
        show_stats()
    elif args.all:
        translate_movies(limit=None, skip_existing=not args.force)
        show_stats()
    elif args.limit:
        translate_movies(limit=args.limit, skip_existing=not args.force)
        show_stats()
    else:
        print("\nMovie Translator (TMDb + LibreTranslate)")
        print("\nUsage:")
        print("  python scripts/translate_movies.py --stats        # Check progress")
        print("  python scripts/translate_movies.py --limit 10     # Test with 10")
        print("  python scripts/translate_movies.py --all          # Translate ALL")
        print("  python scripts/translate_movies.py --all --force  # Re-translate all")
        print("  python scripts/translate_movies.py --audit        # Check quality")
        print("  python scripts/translate_movies.py --audit --fix  # Fix bad translations")
        print("\nNo extra packages needed. Uses TMDb API + LibreTranslate (free).\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nInterrupted.")
        sys.exit(1)
    except Exception as e:
        print(f"\nFatal error: {e}")
        sys.exit(1)
