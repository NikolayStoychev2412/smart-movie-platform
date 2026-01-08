from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    # =========================
    # Database
    # =========================
    DATABASE_URL: str

    # =========================
    # Security / JWT
    # =========================
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # =========================
    # Application
    # =========================
    APP_NAME: str = "Movie Review API"
    DEBUG: bool = True
    DEFAULT_LANGUAGE: str = "bg"

    # =========================
    # CORS
    # =========================
    CORS_ORIGINS: str = "http://localhost:3000"

    # =========================
    # AI / Embeddings
    # =========================
    EMBEDDINGS_PROVIDER: str = "sentence-transformers"
    ST_MODEL_NAME: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIMENSION: int = 384
    FAISS_INDEX_PATH: str = "data/faiss_index"

    # =========================
    # Review / Sentiment
    # =========================
    REVIEW_ANALYSIS_PROVIDER: str = "huggingface"
    HF_SENTIMENT_MODEL: str = "nlptown/bert-base-multilingual-uncased-sentiment"

    # =========================
    # Rate limiting
    # =========================
    SEARCH_RATE_LIMIT: int = 30
    REVIEW_RATE_LIMIT: int = 10

    # =========================
    # Logging
    # =========================
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    # ✅ THIS IS THE MISSING PIECE
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
