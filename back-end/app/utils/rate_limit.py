# app/utils/rate_limit.py
from fastapi import Request, HTTPException
from typing import Dict
from datetime import datetime, timedelta

# Simple in-memory rate limiter
_rate_limit_store: Dict[str, list] = {}


async def rate_limit_dependency(
    request: Request,
    max_requests: int = 30,
    window_seconds: int = 60
):
    """Rate limit dependency for FastAPI endpoints."""
    client_ip = request.client.host if request.client else "unknown"
    now = datetime.now()
    window_start = now - timedelta(seconds=window_seconds)
    
    if client_ip in _rate_limit_store:
        _rate_limit_store[client_ip] = [
            t for t in _rate_limit_store[client_ip] if t > window_start
        ]
    else:
        _rate_limit_store[client_ip] = []
    
    if len(_rate_limit_store[client_ip]) >= max_requests:
        raise HTTPException(
            status_code=429, 
            detail="Too many requests. Please try again later."
        )
    
    _rate_limit_store[client_ip].append(now)
    return None


# Pre-built rate limiters as proper dependencies
def create_rate_limiter(max_requests: int = 30, window_seconds: int = 60):
    """Create a rate limiter with specific limits."""
    async def _rate_limit(request: Request):
        return await rate_limit_dependency(request, max_requests, window_seconds)
    return _rate_limit


# Common rate limiters
search_rate_limit = create_rate_limiter(max_requests=30, window_seconds=60)
recommend_rate_limit = create_rate_limiter(max_requests=10, window_seconds=60)
review_rate_limit = create_rate_limiter(max_requests=30, window_seconds=60)