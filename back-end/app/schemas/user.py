# app/schemas/user.py
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime
import re


DISPOSABLE_DOMAINS = {
    'mailinator.com', '10minutemail.com', 'guerrillamail.com',
    'tempmail.com', 'throwaway.email', 'fakeinbox.com'
}

WEAK_PASSWORDS = {
    'password', '12345678', 'qwerty', 'abc123', 'password1',
    'password123', 'admin123'
}


def _validate_password(v: str) -> str:
    if len(v) < 8:
        raise ValueError('Password must be at least 8 characters long')
    if not re.search(r'[A-Z]', v):
        raise ValueError('Password must contain at least one uppercase letter')
    if not re.search(r'[a-z]', v):
        raise ValueError('Password must contain at least one lowercase letter')
    if not re.search(r'\d', v):
        raise ValueError('Password must contain at least one digit')
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
        raise ValueError('Password must contain at least one special character (!@#$%^&*...)')
    if v.lower() in WEAK_PASSWORDS:
        raise ValueError('Password is too common. Please choose a stronger password')
    return v


class UserBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr

    @field_validator('email')
    @classmethod
    def validate_email_domain(cls, v: str) -> str:
        v = v.lower()
        domain = v.split('@')[1] if '@' in v else ''
        if domain in DISPOSABLE_DOMAINS:
            raise ValueError('Disposable email addresses are not allowed')
        return v


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=100)
    preferred_genres: List[str] = []

    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        return _validate_password(v)


class PasswordChangeIn(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=100)

    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        return _validate_password(v)


class UserOut(UserBase):
    id: int
    is_admin: bool
    created_at: datetime
    preferred_genres: Optional[List[str]] = []
    preferred_mood: Optional[str] = None

    class Config:
        from_attributes = True
