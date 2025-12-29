# app/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Import from config module
from app.config import get_settings

settings = get_settings()

# ✅ Improved connection pool configuration
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=20,           # ✅ Increased from 10
    max_overflow=30,        # ✅ Increased from 20
    pool_timeout=30,        # ✅ Add timeout
    pool_recycle=3600,      # ✅ Recycle connections after 1 hour
    pool_pre_ping=True,     # ✅ Test connections before use
    echo=settings.DEBUG     # ✅ Log SQL in debug mode
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()