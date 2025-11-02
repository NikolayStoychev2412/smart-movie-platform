from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from app.database import engine, Base
from app.routers import movies, users, reviews, auth

# ✅ Load environment variables
load_dotenv()

# ✅ Create FastAPI app
app = FastAPI(
    title=os.getenv("APP_NAME", "Movie Review API"),
    debug=os.getenv("DEBUG", "False").lower() == "true"
)

# ✅ Database setup (create tables)
Base.metadata.create_all(bind=engine)

# ✅ Configure CORS
origins = os.getenv("CORS_ORIGINS", "").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in origins if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(movies.router)
app.include_router(reviews.router)

# ✅ Root endpoint
@app.get("/")
def root():
    return {"message": "Welcome to the Movie Review API"}
