# app/schemas/user.py
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime
import re


class UserBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    
    @validator('email')
    def validate_email_domain(cls, v):
        """Validate email and block disposable domains"""
        # Normalize to lowercase
        v = v.lower()
        
        # Block known disposable email domains
        disposable_domains = [
            'mailinator.com', '10minutemail.com', 'guerrillamail.com',
            'tempmail.com', 'throwaway.email', 'fakeinbox.com'
        ]
        
        domain = v.split('@')[1] if '@' in v else ''
        
        if domain in disposable_domains:
            raise ValueError('Disposable email addresses are not allowed')
        
        return v


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=100)
    
    @validator('password')
    def validate_password_strength(cls, v):
        """Enforce strong password policy"""
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
        
        # Check for common weak passwords
        weak_passwords = [
            'password', '12345678', 'qwerty', 'abc123', 'password1',
            'Password1', 'Password123', 'Admin123'
        ]
        
        if v.lower() in [wp.lower() for wp in weak_passwords]:
            raise ValueError('Password is too common. Please choose a stronger password')
        
        return v


class UserOut(UserBase):
    id: int
    is_admin: bool
    created_at: datetime
    preferred_genres: Optional[List[str]] = []
    preferred_mood: Optional[str] = None

    class Config:
        from_attributes = True