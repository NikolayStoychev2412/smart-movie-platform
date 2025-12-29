"""
Rate limiting for expensive endpoints
"""
from fastapi import HTTPException, Request
from typing import Dict
import time
from collections import defaultdict


class RateLimiter:
    """Simple in-memory rate limiter"""
    
    def __init__(self):
        # Store: {ip: [(timestamp, count), ...]}
        self.requests: Dict[str, list] = defaultdict(list)
        self.cleanup_interval = 60  # Cleanup old entries every 60 seconds
        self.last_cleanup = time.time()
    
    def _cleanup_old_requests(self):
        """Remove requests older than 1 hour"""
        current_time = time.time()
        
        if current_time - self.last_cleanup < self.cleanup_interval:
            return
        
        cutoff_time = current_time - 3600  # 1 hour ago
        
        for ip in list(self.requests.keys()):
            self.requests[ip] = [
                (ts, count) for ts, count in self.requests[ip]
                if ts > cutoff_time
            ]
            
            # Remove empty entries
            if not self.requests[ip]:
                del self.requests[ip]
        
        self.last_cleanup = current_time
    
    def check_rate_limit(
        self,
        request: Request,
        max_requests: int,
        window_seconds: int
    ) -> bool:
        """
        Check if request is within rate limit.
        
        Args:
            request: FastAPI request
            max_requests: Maximum requests allowed
            window_seconds: Time window in seconds
            
        Returns:
            True if within limit, raises HTTPException if exceeded
        """
        self._cleanup_old_requests()
        
        # Get client IP
        client_ip = request.client.host
        current_time = time.time()
        cutoff_time = current_time - window_seconds
        
        # Get recent requests from this IP
        recent_requests = [
            (ts, count) for ts, count in self.requests[client_ip]
            if ts > cutoff_time
        ]
        
        # Count total requests in window
        total_requests = sum(count for _, count in recent_requests)
        
        if total_requests >= max_requests:
            # Rate limit exceeded
            retry_after = int(window_seconds - (current_time - recent_requests[0][0]))
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Try again in {retry_after} seconds.",
                headers={"Retry-After": str(retry_after)}
            )
        
        # Add this request
        self.requests[client_ip].append((current_time, 1))
        
        return True


# Global rate limiter instance
_rate_limiter = RateLimiter()


def get_rate_limiter() -> RateLimiter:
    """Get global rate limiter instance"""
    return _rate_limiter


# Dependency for FastAPI routes
async def rate_limit_dependency(
    request: Request,
    max_requests: int = 10,
    window_seconds: int = 60
):
    """
    FastAPI dependency for rate limiting.
    
    Usage:
        @router.get("/expensive")
        def expensive_endpoint(
            _: None = Depends(lambda r: rate_limit_dependency(r, max_requests=5, window_seconds=60))
        ):
            ...
    """
    limiter = get_rate_limiter()
    limiter.check_rate_limit(request, max_requests, window_seconds)