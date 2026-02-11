from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.movie import Movie
from app.models.review import Review

def recalculate_movie_rating(db: Session, movie_id: int) -> float:
    """Recalculate and update movie's average rating"""
    result = db.query(
        func.avg(Review.rating),
        func.count(Review.id)
    ).filter(Review.movie_id == movie_id).first()
    
    avg_rating, count = result
    
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if movie:
        movie.average_rating = round(float(avg_rating), 1) if avg_rating else 0.0
        movie.review_count = count or 0
        db.commit()
        return movie.average_rating
    
    return 0.0