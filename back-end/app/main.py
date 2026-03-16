# app/main.py
"""FastAPI application entry point."""
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse

from app.database import init_db, close_db


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """Application lifespan manager."""
    logger.info("Starting application...")

    logger.info("Initializing database...")
    await init_db()

    logger.info("Preloading AI models...")
    await preload_models()

    logger.info("Warming up vector store...")
    await warmup_vector_store()

    logger.info("Application ready!")

    yield

    logger.info("Shutting down...")
    await close_db()
    logger.info("Shutdown complete")


async def preload_models():
    """Preload AI models on startup."""
    import asyncio
    from concurrent.futures import ThreadPoolExecutor
    
    def _load_models():
        """Load models in thread (CPU-bound)."""
        try:
            # Import and initialize embedding model
            from app.ai.embeddings import get_embedding_provider
            provider = get_embedding_provider()
            
            # Warm up with a test embedding
            _ = provider.get_embedding("test query warmup")
            logger.info(f"  Loaded embedding model: {provider.model_name}")
            
        except Exception as e:
            logger.error(f"  Error loading models: {e}")
    
    # Run in thread pool to not block event loop
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor() as pool:
        await loop.run_in_executor(pool, _load_models)


async def warmup_vector_store():
    """Warm up vector store by loading index into memory."""
    import asyncio
    from concurrent.futures import ThreadPoolExecutor
    
    def _warmup():
        try:
            from app.ai.vector_store import get_vector_store
            store = get_vector_store()
            stats = store.stats()
            logger.info(f"  Vector store ready: {stats.get('total_vectors', 0)} vectors")
        except Exception as e:
            logger.warning(f"  Vector store warmup: {e}")
    
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor() as pool:
        await loop.run_in_executor(pool, _warmup)


app = FastAPI(
    title="Smart Movie Platform API",
    description="AI-powered movie recommendation system with multilingual support",
    version="2.0.0",
    lifespan=lifespan,
    default_response_class=ORJSONResponse,
)


from app.config import get_settings

_settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.cors_origins_list,
    allow_origin_regex=_settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


from app.routers import movies, auth, watchlist, reviews, users, admin,favorites
from app.routers.ai_router import router as ai_router

app.include_router(movies.router)
app.include_router(auth.router)
app.include_router(watchlist.router)
app.include_router(reviews.router)
app.include_router(ai_router)
app.include_router(favorites.router)
app.include_router(users.router)
app.include_router(admin.router)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Smart Movie Platform API",
        "version": "2.0.0"
    }


@app.get("/health")
async def health_check():
    """Detailed health check."""
    from app.ai.embeddings import get_model_info
    
    return {
        "status": "healthy",
        "database": "connected",
        "ai_model": get_model_info()
    }