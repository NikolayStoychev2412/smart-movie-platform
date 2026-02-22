#!/usr/bin/env python3
"""
Seed realistic demo users with persona-based activity.

Creates 18 users across 6 personas, each with:
- Genre preferences + mood
- 8-20 reviews (with rating style per persona)
- Favorites (from highly-rated reviews)
- Watchlist entries (completed, planned, dropped)
- 15% shared "bridge" movies across personas for collaborative filtering

Usage:
    python scripts/seed_users.py
    python scripts/seed_users.py --clear   # Remove seed users first
"""
import sys
import os
import random
import argparse
import logging
from pathlib import Path
from datetime import datetime, timedelta, timezone

project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import text, func
from app.database import SyncSessionLocal
from app.models.movie import Movie
from app.models.user import User
from app.models.review import Review
from app.models.watchlist import Watchlist, WatchStatus
from app.models.favorite import Favorite
from app.utils.security import hash_password

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# All seed users share this password (for demo login)
SEED_PASSWORD = "Demo1234!"
SEED_EMAIL_DOMAIN = "cinevault-demo.com"

# ============================================================================
# PERSONAS
# ============================================================================

PERSONAS = [
    # Persona 1: Action/Sci-Fi fans (generous raters, love franchises)
    {
        "name": "ActionFan",
        "users": [
            {"name": "Alex Rider", "email": "alex@"},
            {"name": "Marcus Chen", "email": "marcus@"},
            {"name": "Sara Blade", "email": "sara.blade@"},
        ],
        "genres": ["action", "scifi", "adventure"],
        "mood": "thrilling",
        "core_genres_db": ["Action", "Science Fiction", "Adventure"],
        "adjacent_genres_db": ["Thriller", "Fantasy", "Crime"],
        "rating_style": {"mean": 4.0, "std": 0.7, "min": 2.0, "max": 5.0},
        "review_count": (12, 18),
        "favorite_rate": 0.35,
        "watchlist_extra": 6,
        "drop_rate": 0.1,
    },
    # Persona 2: Horror/Thriller fans (harsh raters, short blunt reviews)
    {
        "name": "HorrorBuff",
        "users": [
            {"name": "Damien Voss", "email": "damien@"},
            {"name": "Luna Graves", "email": "luna.graves@"},
            {"name": "Victor Shade", "email": "victor@"},
        ],
        "genres": ["horror", "thriller", "crime"],
        "mood": "scary",
        "core_genres_db": ["Horror", "Thriller", "Mystery"],
        "adjacent_genres_db": ["Crime", "Drama"],
        "rating_style": {"mean": 3.2, "std": 1.0, "min": 1.0, "max": 5.0},
        "review_count": (10, 16),
        "favorite_rate": 0.25,
        "watchlist_extra": 5,
        "drop_rate": 0.2,
    },
    # Persona 3: Drama/Romance fans (emotional, longer reviews, generous)
    {
        "name": "DramaLover",
        "users": [
            {"name": "Elena Petrova", "email": "elena@"},
            {"name": "Sophie Laurent", "email": "sophie@"},
            {"name": "Aisha Patel", "email": "aisha@"},
        ],
        "genres": ["drama", "romance", "thriller"],
        "mood": "emotional",
        "core_genres_db": ["Drama", "Romance"],
        "adjacent_genres_db": ["War", "History", "Crime"],
        "rating_style": {"mean": 3.8, "std": 0.8, "min": 2.0, "max": 5.0},
        "review_count": (10, 18),
        "favorite_rate": 0.30,
        "watchlist_extra": 7,
        "drop_rate": 0.08,
    },
    # Persona 4: Animation/Family fans (balanced raters, wholesome)
    {
        "name": "AnimeFan",
        "users": [
            {"name": "Mia Tanaka", "email": "mia.tanaka@"},
            {"name": "Leo Park", "email": "leo.park@"},
            {"name": "Nora Fischer", "email": "nora@"},
        ],
        "genres": ["animation", "fantasy", "adventure"],
        "mood": "happy",
        "core_genres_db": ["Animation", "Family", "Fantasy"],
        "adjacent_genres_db": ["Adventure", "Comedy", "Music"],
        "rating_style": {"mean": 4.2, "std": 0.6, "min": 3.0, "max": 5.0},
        "review_count": (8, 15),
        "favorite_rate": 0.40,
        "watchlist_extra": 8,
        "drop_rate": 0.05,
    },
    # Persona 5: Comedy fans (easy-going, medium reviews)
    {
        "name": "ComedyKing",
        "users": [
            {"name": "Jake Morrison", "email": "jake@"},
            {"name": "Priya Sharma", "email": "priya@"},
            {"name": "Tom Baker", "email": "tom.baker@"},
        ],
        "genres": ["comedy", "adventure", "animation"],
        "mood": "relaxed",
        "core_genres_db": ["Comedy"],
        "adjacent_genres_db": ["Romance", "Drama", "Family", "Animation"],
        "rating_style": {"mean": 3.6, "std": 0.9, "min": 1.0, "max": 5.0},
        "review_count": (10, 16),
        "favorite_rate": 0.28,
        "watchlist_extra": 5,
        "drop_rate": 0.15,
    },
    # Persona 6: Crime/Documentary fans (critical, analytical reviews)
    {
        "name": "CineCritic",
        "users": [
            {"name": "David Stern", "email": "david.stern@"},
            {"name": "Ingrid Holm", "email": "ingrid@"},
            {"name": "Rafael Diaz", "email": "rafael@"},
        ],
        "genres": ["crime", "documentary", "drama"],
        "mood": "thoughtful",
        "core_genres_db": ["Crime", "Documentary", "History"],
        "adjacent_genres_db": ["Drama", "Thriller", "War", "Mystery"],
        "rating_style": {"mean": 3.4, "std": 1.1, "min": 1.0, "max": 5.0},
        "review_count": (12, 20),
        "favorite_rate": 0.22,
        "watchlist_extra": 6,
        "drop_rate": 0.18,
    },
]

# ============================================================================
# REVIEW TEMPLATES (per persona style)
# ============================================================================

REVIEW_TEMPLATES = {
    "ActionFan": {
        "high": [
            "Absolutely insane action sequences. The final act had me on the edge of my seat.",
            "Non-stop adrenaline from start to finish. This is what blockbusters should be.",
            "The VFX were incredible and the pacing was perfect. Loved every minute.",
            "Epic scale, great choreography. One of the best action movies I've seen recently.",
            "Didn't expect the story to be this good on top of the action. Pleasantly surprised.",
        ],
        "mid": [
            "Decent action but the plot was predictable. Still entertaining though.",
            "Good effects, mediocre script. Worth a watch if you like the genre.",
            "Some cool set pieces but the middle act dragged a bit.",
            "Fun popcorn movie. Nothing groundbreaking but enjoyable.",
        ],
        "low": [
            "All style, no substance. The CGI couldn't save this one.",
            "Boring despite the explosions. Seen it all before, done better.",
        ],
    },
    "HorrorBuff": {
        "high": [
            "Genuinely terrifying. The atmosphere was suffocating in the best way.",
            "Finally a horror movie that doesn't rely on cheap jump scares. Real dread.",
            "Disturbing and unforgettable. This one stays with you.",
            "The tension was masterfully built. Every scene added to the unease.",
        ],
        "mid": [
            "Had its moments but nothing I haven't seen before.",
            "Started strong, fell apart in the third act. Disappointing.",
            "Average horror fare. A few good scares but mostly predictable.",
        ],
        "low": [
            "Not scary at all. Complete waste of time.",
            "Laughably bad. The 'twist' was visible from the first scene.",
            "Generic jump scare factory. Horror deserves better than this.",
        ],
    },
    "DramaLover": {
        "high": [
            "Beautifully acted and deeply moving. I was in tears by the end.",
            "A masterclass in storytelling. Every character felt real and layered.",
            "This film reminded me why I love cinema. Raw, honest, unforgettable.",
            "The performances were extraordinary. Oscar-worthy across the board.",
            "Subtle and powerful. It doesn't shout — it whispers, and it stays with you.",
        ],
        "mid": [
            "Well-made but didn't connect with me emotionally as much as I hoped.",
            "Good performances elevate a somewhat conventional script.",
            "Interesting premise, uneven execution. Still worth seeing for the lead.",
        ],
        "low": [
            "Tried too hard to be emotional and ended up feeling manipulative.",
            "Flat characters despite a promising setup. Couldn't stay invested.",
        ],
    },
    "AnimeFan": {
        "high": [
            "Visually stunning! The animation quality was breathtaking.",
            "Perfect for all ages. Funny, heartwarming, and surprisingly deep.",
            "The world-building was incredible. I want to live in this universe.",
            "So much heart and creativity packed into every frame. Loved it!",
        ],
        "mid": [
            "Cute and fun but nothing special. Kids will enjoy it more.",
            "Nice animation, story was a bit formulaic though.",
            "Enjoyable watch but forgettable. Didn't leave a lasting impression.",
        ],
        "low": [
            "Felt like a cash grab. No soul in the story.",
            "Disappointing sequel. Lost the magic of the original.",
        ],
    },
    "ComedyKing": {
        "high": [
            "Hilarious from start to finish. I haven't laughed this hard in ages.",
            "Witty script with perfect comedic timing. Every joke landed.",
            "Smart humor that doesn't talk down to the audience. Refreshing!",
            "Laugh-out-loud funny AND has genuine heart. Rare combo.",
        ],
        "mid": [
            "A few genuinely funny moments but a lot of filler in between.",
            "Hit or miss humor. Some jokes were great, others fell flat.",
            "Decent comedy. Nothing revolutionary but a fun time.",
        ],
        "low": [
            "The trailer had all the funny parts. The rest was painful.",
            "Tried way too hard. Forced humor is worse than no humor.",
        ],
    },
    "CineCritic": {
        "high": [
            "Technically brilliant. The cinematography and editing are flawless.",
            "A thought-provoking film that rewards patient viewers. Masterfully crafted.",
            "Essential viewing. This pushes the boundaries of the medium.",
            "Layered narrative with impeccable direction. Cinema at its finest.",
        ],
        "mid": [
            "Competently made but lacks the ambition to be truly memorable.",
            "Good craft, conventional story. Watchable but not essential.",
            "Shows potential but doesn't fully commit to its ideas.",
        ],
        "low": [
            "Pretentious and hollow. Style over substance taken to extremes.",
            "A structural mess. No clear vision from the director.",
            "Fails on nearly every level despite a talented cast.",
        ],
    },
}


def get_review_text(persona_name: str, rating: float) -> str:
    """Pick a review comment matching the persona style and rating."""
    templates = REVIEW_TEMPLATES.get(persona_name, REVIEW_TEMPLATES["ActionFan"])
    if rating >= 4.0:
        pool = templates["high"]
    elif rating >= 2.5:
        pool = templates["mid"]
    else:
        pool = templates["low"]
    return random.choice(pool)


def generate_rating(style: dict) -> float:
    """Generate a rating following the persona's style."""
    rating = random.gauss(style["mean"], style["std"])
    rating = max(style["min"], min(style["max"], rating))
    return round(rating * 2) / 2  # Round to nearest 0.5


def get_movies_by_genres(db, genre_keywords: list, limit: int) -> list:
    """Get movies matching any of the genre keywords."""
    movies = []
    for genre in genre_keywords:
        found = db.query(Movie).filter(
            Movie.genre.ilike(f"%{genre}%")
        ).order_by(func.random()).limit(limit).all()
        movies.extend(found)

    # Deduplicate
    seen = set()
    unique = []
    for m in movies:
        if m.id not in seen:
            seen.add(m.id)
            unique.append(m)
    random.shuffle(unique)
    return unique


def get_bridge_movies(db, count: int = 20) -> list:
    """Get popular movies shared across personas (collaborative bridges)."""
    return db.query(Movie).order_by(
        Movie.popularity.desc()
    ).limit(count).all()


def seed_users(db, clear_existing: bool = False):
    """Main seeding function."""

    if clear_existing:
        logger.info("Clearing existing seed users...")
        seed_users_db = db.query(User).filter(
            User.email.like(f"%@{SEED_EMAIL_DOMAIN}")
        ).all()
        for u in seed_users_db:
            db.delete(u)
        db.commit()
        logger.info(f"  Removed {len(seed_users_db)} seed users")

    # Check movie count
    movie_count = db.query(Movie).count()
    if movie_count < 50:
        logger.error(f"Only {movie_count} movies in DB. Need at least 50. Run import first.")
        return

    logger.info(f"Database has {movie_count} movies")

    # Get bridge movies (popular movies shared across all personas)
    bridge_movies = get_bridge_movies(db, count=25)
    bridge_ids = {m.id for m in bridge_movies}
    logger.info(f"Selected {len(bridge_movies)} bridge movies for collaborative overlap")

    hashed_pw = hash_password(SEED_PASSWORD)
    total_users = 0
    total_reviews = 0
    total_favorites = 0
    total_watchlist = 0

    for persona in PERSONAS:
        logger.info(f"\n--- Persona: {persona['name']} ---")
        logger.info(f"  Genres: {persona['genres']}, Mood: {persona['mood']}")

        # Get candidate movies for this persona
        core_movies = get_movies_by_genres(db, persona["core_genres_db"], limit=60)
        adjacent_movies = get_movies_by_genres(db, persona["adjacent_genres_db"], limit=30)

        if len(core_movies) < 5:
            logger.warning(f"  Only {len(core_movies)} core movies found. Skipping persona.")
            continue

        for user_info in persona["users"]:
            email = user_info["email"] + SEED_EMAIL_DOMAIN
            name = user_info["name"]

            # Check if already exists
            existing = db.query(User).filter(User.email == email).first()
            if existing:
                logger.info(f"  User '{name}' already exists, skipping")
                continue

            # Create user
            user = User(
                name=name,
                email=email,
                hashed_password=hashed_pw,
                preferred_genres=persona["genres"],
                preferred_mood=persona["mood"],
                is_admin=False,
            )
            db.add(user)
            db.flush()  # Get the user ID
            total_users += 1

            logger.info(f"  Created user: {name} (#{user.id})")

            # Build movie pool: 60% core, 25% adjacent, 15% bridge
            review_min, review_max = persona["review_count"]
            num_reviews = random.randint(review_min, review_max)

            n_core = int(num_reviews * 0.60)
            n_adjacent = int(num_reviews * 0.25)
            n_bridge = num_reviews - n_core - n_adjacent

            review_movies = []
            review_movies.extend(random.sample(core_movies, min(n_core, len(core_movies))))
            review_movies.extend(random.sample(adjacent_movies, min(n_adjacent, len(adjacent_movies))))
            review_movies.extend(random.sample(bridge_movies, min(n_bridge, len(bridge_movies))))

            # Deduplicate
            seen_movie_ids = set()
            unique_review_movies = []
            for m in review_movies:
                if m.id not in seen_movie_ids:
                    seen_movie_ids.add(m.id)
                    unique_review_movies.append(m)
            review_movies = unique_review_movies[:num_reviews]

            # Create reviews
            user_favorites = []
            for movie in review_movies:
                rating = generate_rating(persona["rating_style"])
                comment = get_review_text(persona["name"], rating)

                # Vary created_at over last 90 days
                days_ago = random.randint(1, 90)
                created_at = datetime.now(timezone.utc) - timedelta(days=days_ago)

                review = Review(
                    movie_id=movie.id,
                    user_id=user.id,
                    rating=rating,
                    comment=comment,
                    created_at=created_at,
                )
                db.add(review)
                total_reviews += 1

                # Favorite highly-rated movies
                if rating >= 4.0 and random.random() < persona["favorite_rate"]:
                    fav = Favorite(
                        user_id=user.id,
                        movie_id=movie.id,
                        created_at=created_at + timedelta(hours=random.randint(1, 48)),
                    )
                    db.add(fav)
                    user_favorites.append(movie.id)
                    total_favorites += 1

            # Create watchlist entries (completed = reviewed movies, plus extras)
            # Mark reviewed movies as COMPLETED
            for movie in review_movies:
                wl = Watchlist(
                    user_id=user.id,
                    movie_id=movie.id,
                    status=WatchStatus.COMPLETED,
                    created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 120)),
                )
                db.add(wl)
                total_watchlist += 1

            # Add extra watchlist entries (planned, watching, dropped)
            extra_seen = set()
            extra_pool = []
            for m in (core_movies + adjacent_movies + bridge_movies):
                if m.id not in seen_movie_ids and m.id not in extra_seen:
                    extra_seen.add(m.id)
                    extra_pool.append(m)
            random.shuffle(extra_pool)
            extra_count = min(persona["watchlist_extra"], len(extra_pool))

            for i, movie in enumerate(extra_pool[:extra_count]):
                r = random.random()
                if r < persona["drop_rate"]:
                    status = WatchStatus.DROPPED
                elif r < 0.3:
                    status = WatchStatus.WATCHING
                else:
                    status = WatchStatus.PLANNED

                wl = Watchlist(
                    user_id=user.id,
                    movie_id=movie.id,
                    status=status,
                    created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 60)),
                )
                db.add(wl)
                total_watchlist += 1

            db.flush()

            logger.info(f"    Reviews: {len(review_movies)}, Favorites: {len(user_favorites)}, "
                        f"Watchlist: {len(review_movies) + extra_count}")

    db.commit()
    logger.info(f"\n{'='*50}")
    logger.info(f"SEEDING COMPLETE")
    logger.info(f"  Users created:    {total_users}")
    logger.info(f"  Reviews created:  {total_reviews}")
    logger.info(f"  Favorites:        {total_favorites}")
    logger.info(f"  Watchlist entries: {total_watchlist}")

    # Update movie average_rating and review_count
    logger.info("\nUpdating movie ratings...")
    update_movie_ratings(db)


def update_movie_ratings(db):
    """Recalculate average_rating and review_count for all movies with reviews."""
    movies_with_reviews = db.query(
        Review.movie_id,
        func.avg(Review.rating).label("avg_rating"),
        func.count(Review.id).label("cnt"),
    ).group_by(Review.movie_id).all()

    updated = 0
    for movie_id, avg_rating, cnt in movies_with_reviews:
        movie = db.query(Movie).filter(Movie.id == movie_id).first()
        if movie:
            movie.average_rating = round(float(avg_rating), 2)
            movie.review_count = cnt
            updated += 1

    db.commit()
    logger.info(f"  Updated ratings for {updated} movies")


def main():
    parser = argparse.ArgumentParser(description="Seed demo users with persona-based activity")
    parser.add_argument("--clear", action="store_true",
                        help="Remove existing seed users before creating new ones")
    args = parser.parse_args()

    print("\nCineVault User Seeder\n")

    db = SyncSessionLocal()
    try:
        seed_users(db, clear_existing=args.clear)
    except Exception as e:
        logger.error(f"Seeding failed: {e}", exc_info=True)
        db.rollback()
    finally:
        db.close()

    print("\nDone. Seed users can log in with:")
    print(f"  Password: {SEED_PASSWORD}")
    print(f"  Emails: <name>@{SEED_EMAIL_DOMAIN}")
    print()


if __name__ == "__main__":
    main()
