# app/main.py
from fastapi import FastAPI,Request
from fastapi.middleware.cors import CORSMiddleware
import time
import uuid
from app.database import engine, Base
from app.routers import movies, users, reviews, auth, ai_router
from app.routers import watchlist 
from app.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
    docs_url="/docs", # ✅ Hide docs in production
    redoc_url="/redoc" if settings.DEBUG else None
)

# Create database tables
Base.metadata.create_all(bind=engine)


# ✅ ADD: Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add security headers to all responses"""
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    # Add security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = str(process_time)
    
    # Add HSTS only in production (not localhost)
    if not settings.DEBUG and request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    # ✅ FIX: Relaxed CSP for /docs and /redoc
    if request.url.path in ["/docs", "/redoc", "/openapi.json"]:
        # Allow Swagger UI resources
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "img-src 'self' data: https://fastapi.tiangolo.com; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "font-src 'self' https://cdn.jsdelivr.net;"
        )
    elif not settings.DEBUG:
        # Strict CSP for other pages in production
        response.headers["Content-Security-Policy"] = "default-src 'self'"
    
    return response


# ✅ FIX: Restrict CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,  # Use from config
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],  # ✅ Explicit methods
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],  # ✅ Explicit headers
    max_age=3600
)

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(movies.router)
app.include_router(reviews.router)
app.include_router(watchlist.router)  # ✨ NEW
app.include_router(ai_router.router)

@app.get("/")
def root():
    return {"message": "Welcome to the Movie Review API with AI + Watchlist!"}
@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "debug_mode": settings.DEBUG
    }