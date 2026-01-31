# app/routers/users.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserOut
from app.utils.security import hash_password, get_current_user, require_admin
from sqlalchemy.exc import IntegrityError
from app.utils.audit import log_security_event, SecurityEventType

router = APIRouter(prefix="/users", tags=["Users"])


# ============================================================================
# PREFERENCE SCHEMAS
# ============================================================================

class UserPreferencesIn(BaseModel):
    """Schema for updating user preferences"""
    preferred_genres: Optional[List[str]] = None
    preferred_mood: Optional[str] = None


class UserPreferencesOut(BaseModel):
    """Schema for user preferences response"""
    preferred_genres: List[str]
    preferred_mood: Optional[str]
    
    class Config:
        from_attributes = True


# ============================================================================
# USER CRUD ENDPOINTS
# ============================================================================

@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    user: UserCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Register a new user (public endpoint)"""
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # ✅ FIX: Explicitly set fields, NEVER trust user input for is_admin
    hashed_password = hash_password(user.password)
    db_user = User(
        name=user.name,
        email=user.email,
        hashed_password=hashed_password,
        is_admin=False  # ✅ HARDCODED - cannot be overridden
    )
    
    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        # ✅ Log user creation
        log_security_event(
            SecurityEventType.USER_CREATED,
            user_id=db_user.id,
            user_email=db_user.email,
            ip_address=request.client.host if request.client else "unknown",
            details={"name": db_user.name}
        )
        
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    return db_user


@router.get("/me", response_model=UserOut)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get current logged-in user's profile"""
    return current_user


@router.get("/", response_model=list[UserOut])
def get_all_users(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all users (admin only)"""
    return db.query(User).all()


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get a specific user by ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete a user (admin only)"""
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent deleting yourself
    if db_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    # ✅ Log before deletion
    log_security_event(
        SecurityEventType.USER_DELETED,
        user_id=current_user.id,
        user_email=current_user.email,
        ip_address=request.client.host if request.client else "unknown",
        details={
            "deleted_user_id": db_user.id,
            "deleted_user_email": db_user.email
        }
    )
    
    db.delete(db_user)
    db.commit()
    return {"detail": f"User {user_id} deleted successfully"}


@router.patch("/{user_id}/make-admin")
def make_user_admin(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Make a user an admin (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_admin = True
    db.commit()
    db.refresh(user)
    return {"detail": f"User {user.email} is now an admin"}


# ============================================================================
# USER PREFERENCES ENDPOINTS (for cold-start recommendations)
# ============================================================================

@router.get("/preferences", response_model=UserPreferencesOut)
def get_user_preferences(
    current_user: User = Depends(get_current_user)
):
    """
    Get current user's preferences for recommendations.
    Used by the frontend to check if preferences were saved.
    """
    return UserPreferencesOut(
        preferred_genres=current_user.preferred_genres or [],
        preferred_mood=getattr(current_user, 'preferred_mood', None)
    )


@router.post("/preferences", response_model=UserPreferencesOut)
def save_user_preferences(
    preferences: UserPreferencesIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Save user preferences for personalized recommendations.
    
    Called during registration (step 2 & 3) after account creation.
    These preferences enable cold-start recommendations for new users.
    
    Example request:
    {
        "preferred_genres": ["action", "comedy", "scifi"],
        "preferred_mood": "thrilling"
    }
    """
    # Update genres if provided
    if preferences.preferred_genres is not None:
        current_user.preferred_genres = preferences.preferred_genres
    
    # Update mood if provided
    if preferences.preferred_mood is not None:
        current_user.preferred_mood = preferences.preferred_mood
    
    db.commit()
    db.refresh(current_user)
    
    return UserPreferencesOut(
        preferred_genres=current_user.preferred_genres or [],
        preferred_mood=getattr(current_user, 'preferred_mood', None)
    )


@router.put("/preferences", response_model=UserPreferencesOut)
def replace_user_preferences(
    preferences: UserPreferencesIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Replace all user preferences (full update).
    Use this when user wants to reset their preferences.
    """
    current_user.preferred_genres = preferences.preferred_genres or []
    current_user.preferred_mood = preferences.preferred_mood
    
    db.commit()
    db.refresh(current_user)
    
    return UserPreferencesOut(
        preferred_genres=current_user.preferred_genres or [],
        preferred_mood=getattr(current_user, 'preferred_mood', None)
    )