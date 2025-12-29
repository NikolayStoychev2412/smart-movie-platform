from fastapi import APIRouter, Depends, HTTPException, status
from psycopg2 import IntegrityError
from sqlalchemy.orm import Session
from app.schemas.review import ReviewCreate, ReviewOut
from app.models.movie import Movie
from app.models.review import Review
from app.models.user import User
from app.database import get_db
from app.utils.security import get_current_user
from app.utils.ratings import recalculate_movie_rating

router = APIRouter(prefix="/reviews", tags=["Reviews"])

@router.post("/movies/{movie_id}", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
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
    
    # ✅ FIX: Let database unique constraint handle race condition
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
        # ✅ Database constraint prevented duplicate
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reviewed this movie"
        )

    # Recalculate movie rating after new review
    from app.utils.ratings import recalculate_movie_rating
    recalculate_movie_rating(db, movie_id)

    return db_review


@router.get("/movies/{movie_id}", response_model=list[ReviewOut])
def list_reviews(movie_id: int, db: Session = Depends(get_db)):
    """Get all reviews for a movie (public)"""
    return db.query(Review).filter(Review.movie_id == movie_id).all()


@router.get("/my-reviews", response_model=list[ReviewOut])
def get_my_reviews(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all reviews by the current user"""
    return db.query(Review).filter(Review.user_id == current_user.id).all()


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
    
    # Check if the current user owns this review
    if review.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own reviews"
        )
    
    for key, value in updated_review.dict(exclude_unset=True).items():
        setattr(review, key, value)
    
    db.commit()
    db.refresh(review)

    # ✅ Recalculate movie rating after review update
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
    
    # Check if user owns the review or is admin
    if review.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own reviews"
        )
    
    movie_id = review.movie_id  # ✅ Save before deleting

    db.delete(review)
    db.commit()

    # ✅ Recalculate movie rating after deletion
    recalculate_movie_rating(db, movie_id)

    return {"detail": "Review deleted successfully"}
