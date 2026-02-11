# app/routers/reviews.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload
from app.schemas.review import ReviewCreate, ReviewOut
from app.models.movie import Movie
from app.models.review import Review
from app.models.user import User
from app.database import get_db
from app.utils.security import get_current_user
from app.utils.ratings import recalculate_movie_rating

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.post("/movies/{movie_id}", status_code=status.HTTP_201_CREATED)
def create_review(
    movie_id: int,
    review: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a review for a movie (authenticated users only)"""
    # Check if movie exists
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    # Create review - database constraint handles duplicates
    db_review = Review(
        user_id=current_user.id,
        movie_id=movie_id,
        rating=review.rating,
        comment=review.comment
    )

    try:
        db.add(db_review)
        db.commit()
        db.refresh(db_review)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reviewed this movie"
        )

    # Recalculate movie rating
    recalculate_movie_rating(db, movie_id)

    # Return with user_name
    return {
        "id": db_review.id,
        "user_id": db_review.user_id,
        "movie_id": db_review.movie_id,
        "rating": db_review.rating,
        "comment": db_review.comment,
        "created_at": db_review.created_at,
        "user_name": current_user.name
    }


@router.get("/movies/{movie_id}")
def list_reviews(movie_id: int, db: Session = Depends(get_db)):
    """Get all reviews for a movie (public)"""
    reviews = db.query(Review).options(
        selectinload(Review.user)
    ).filter(Review.movie_id == movie_id).order_by(Review.created_at.desc()).all()

    return [
        {
            "id": review.id,
            "user_id": review.user_id,
            "movie_id": review.movie_id,
            "rating": review.rating,
            "comment": review.comment,
            "created_at": review.created_at,
            "user_name": review.user.name if review.user else "User"
        }
        for review in reviews
    ]


@router.get("/my-reviews")
def get_my_reviews(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all reviews by the current user with movie info"""
    reviews = db.query(Review).options(
        selectinload(Review.movie)
    ).filter(Review.user_id == current_user.id).order_by(Review.created_at.desc()).all()

    result = []
    for review in reviews:
        movie = review.movie
        result.append({
            "id": review.id,
            "user_id": review.user_id,
            "movie_id": review.movie_id,
            "rating": review.rating,
            "comment": review.comment,
            "created_at": review.created_at,
            "user_name": current_user.name,
            "movie": {
                "id": movie.id,
                "title": movie.title,
                "title_bg": movie.title_bg,
                "poster_url": movie.poster_url,
                "poster_path": movie.poster_path,
                "release_year": movie.release_year,
                "genre": movie.genre,
                "genre_bg": movie.genre_bg,
            } if movie else None
        })

    return result


@router.put("/{review_id}", response_model=ReviewOut)
def update_review(
    review_id: int, 
    updated_review: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a review (only the review owner can update)"""
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Check ownership
    if review.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own reviews"
        )
    
    for key, value in updated_review.dict(exclude_unset=True).items():
        setattr(review, key, value)
    
    db.commit()
    db.refresh(review)

    # Recalculate movie rating
    recalculate_movie_rating(db, review.movie_id)

    return review


@router.delete("/{review_id}")
def delete_review(
    review_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a review (owner or admin only)"""
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Check ownership or admin
    if review.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own reviews"
        )
    
    movie_id = review.movie_id

    db.delete(review)
    db.commit()

    # Recalculate movie rating
    recalculate_movie_rating(db, movie_id)

    return {"detail": "Review deleted successfully"}