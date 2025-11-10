# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import movies, users, reviews, auth
from app.routers import ai_router  # ✨ ADD THIS LINE
from app.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG
)

# Create database tables
Base.metadata.create_all(bind=engine)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(movies.router)
app.include_router(reviews.router)
app.include_router(ai_router.router)  # ✨ ADD THIS LINE

@app.get("/")
def root():
    return {"message": "Welcome to the Movie Review API with AI!"}