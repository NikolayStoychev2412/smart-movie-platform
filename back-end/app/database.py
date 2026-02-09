# app/database.py
"""
Database configuration with async support for better performance.
"""
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

# Load .env file FIRST before anything else
from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, event
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from sqlalchemy.pool import StaticPool

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./movies.db")

# Determine if using SQLite or PostgreSQL
IS_SQLITE = DATABASE_URL.startswith("sqlite")

# Convert URL for async driver
if IS_SQLITE:
    ASYNC_DATABASE_URL = DATABASE_URL.replace("sqlite://", "sqlite+aiosqlite://")
else:
    # postgresql://... -> postgresql+asyncpg://...
    ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

# Base class for models
Base = declarative_base()


# Sync engine (for migrations and background tasks)
if IS_SQLITE:
    sync_engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
else:
    sync_engine = create_engine(
        DATABASE_URL,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
    )

# Sync session factory
SyncSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)


# Async engine (for API requests)
if IS_SQLITE:
    async_engine = create_async_engine(
        ASYNC_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
else:
    async_engine = create_async_engine(
        ASYNC_DATABASE_URL,
        pool_size=20,
        max_overflow=30,
        pool_pre_ping=True,
        pool_recycle=3600,
    )

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


def get_db() -> Session:
    """Sync database session dependency."""
    db = SyncSessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """Async database session dependency."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


@asynccontextmanager
async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """Async context manager for database sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database tables."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db():
    """Close database connections on shutdown."""
    await async_engine.dispose()


if IS_SQLITE:
    @event.listens_for(sync_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA cache_size=-64000")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA mmap_size=268435456")
        cursor.close()