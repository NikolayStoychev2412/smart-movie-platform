from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.movie import Movie
from app.models.user import User
from app.schemas.movie import MovieCreate, MovieOut, MovieUpdate
from app.utils.security import require_admin

router = APIRouter(prefix="/movies", tags=["Movies"])

# Public endpoints (no authentication required)
@router.get("/", response_model=list[MovieOut])
def get_movies(db: Session = Depends(get_db)):
    """Get all movies (public)"""
    return db.query(Movie).all()

@router.get("/{movie_id}", response_model=MovieOut)
def get_movie(movie_id: int, db: Session = Depends(get_db)):
    """Get a specific movie (public)"""
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    return movie

# Admin-only endpoints
@router.post("/", response_model=MovieOut, status_code=status.HTTP_201_CREATED)
def create_movie(
    movie: MovieCreate, 
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Create a new movie (admin only)"""
    # ✅ FIX: Explicitly set only allowed fields
    db_movie = Movie(
        title=movie.title,
        genre=movie.genre,
        summary=movie.summary,
        poster_url=movie.poster_url,
        average_rating=0.0  # Always start at 0
    )
    db.add(db_movie)
    db.commit()
    db.refresh(db_movie)
    return db_movie

@router.put("/{movie_id}", response_model=MovieOut)
def update_movie(
    movie_id: int, 
    movie: MovieUpdate, 
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update a movie (admin only)"""
    db_movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not db_movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    
    # ✅ FIX: Only update allowed fields explicitly
    update_data = movie.dict(exclude_unset=True)
    
    # Whitelist of allowed fields for update
    allowed_fields = {'title', 'genre', 'summary', 'poster_url'}
    
    for key, value in update_data.items():
        if key in allowed_fields:
            setattr(db_movie, key, value)
    
    db.commit()
    db.refresh(db_movie)
    return db_movie
@router.delete("/{movie_id}")
def delete_movie(
    movie_id: int, 
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete a movie (admin only)"""
    db_movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not db_movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    
    db.delete(db_movie)
    db.commit()
    return {"detail": f"Movie {movie_id} deleted successfully"}