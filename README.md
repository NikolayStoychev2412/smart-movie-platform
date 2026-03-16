# Smart Movie Platform

An AI-powered movie platform with semantic search, personalised recommendations, and multilingual support (English & Bulgarian).

---

## Features

- **AI Semantic Search** — natural language queries in English or Bulgarian powered by `paraphrase-multilingual-MiniLM-L12-v2`
- **Smart Recommendations** — hybrid collaborative + content-based filtering via FAISS vector store
- **Review Sentiment Analysis** — automatic sentiment scoring using `nlptown/bert-base-multilingual-uncased-sentiment`
- **User Profiles** — stats, taste card, genre preferences, activity feed
- **Watchlist & Favourites** — full CRUD for personalised lists
- **Admin Panel** — user management, audit log, movie CRUD, analytics
- **JWT Authentication** — secure login with bcrypt password hashing
- **Rate Limiting** — per-endpoint in-memory rate limiter

---

## Tech Stack

### Back-end
| Layer | Technology |
|-------|-----------|
| Framework | FastAPI |
| Database | PostgreSQL + SQLAlchemy (async) |
| AI / ML | sentence-transformers, FAISS, HuggingFace transformers, PyTorch |
| Auth | python-jose (JWT), passlib (bcrypt) |
| Server | Uvicorn / Gunicorn |

### Front-end
| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Styling | Tailwind CSS |
| State | React Context |
| i18n | react-i18next (EN / BG) |
| Build | Vite |

### Infrastructure
| Component | Technology |
|-----------|-----------|
| Reverse proxy | Caddy |
| Containerisation | Docker + Docker Compose |

---

## Project Structure

```
smart-movie-platform/
├── back-end/
│   ├── app/
│   │   ├── ai/               # Embeddings, FAISS store, semantic search, sentiment
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── routers/          # FastAPI route handlers
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── utils/            # Auth, rate limiting, audit logging
│   │   ├── config.py         # Settings (pydantic-settings)
│   │   ├── database.py       # Async DB engine & session
│   │   └── main.py           # App entry point
│   ├── data/                 # FAISS index files & audit log
│   ├── scripts/              # Data seeding / utility scripts
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── front-end/
│   └── smart-movie-library/
│       └── src/
│           ├── api/           # Axios service layer
│           ├── components/    # Reusable UI components
│           ├── context/       # AppContext (auth, theme, language)
│           ├── i18n/          # Translation files
│           ├── pages/         # Route-level pages
│           └── types/         # TypeScript interfaces
├── docker-compose.yml
├── Caddyfile
└── README.md
```

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Docker & Docker Compose (for containerised setup)

---

### Back-end (local dev)

```bash
cd back-end

# Create and activate virtual environment
python -m venv fast-api-env
source fast-api-env/bin/activate  # Windows: fast-api-env\Scripts\activate

# Install CPU-only PyTorch first (avoids pulling the ~2 GB CUDA build)
pip install torch --index-url https://download.pytorch.org/whl/cpu

# Install remaining dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL, SECRET_KEY, etc.

# Run development server
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.
Interactive docs: `http://localhost:8000/docs`

---

### Front-end (local dev)

```bash
cd front-end/smart-movie-library

npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

---

### Docker (full stack)

```bash
# From the project root
docker-compose up --build
```

---

## Environment Variables

Create `back-end/.env` with the following keys:

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/movies_db

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# CORS
CORS_ORIGINS=http://localhost:5173

# AI Models (optional — defaults shown)
ST_MODEL_NAME=paraphrase-multilingual-MiniLM-L12-v2
HF_SENTIMENT_MODEL=nlptown/bert-base-multilingual-uncased-sentiment
EMBEDDING_DIMENSION=384
FAISS_INDEX_PATH=data/faiss_index
```

---

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/token` | Login — returns JWT |
| GET | `/movies` | List / filter movies |
| GET | `/movies/{id}` | Movie details |
| GET | `/ai/search` | Semantic search |
| GET | `/ai/recommend/{id}` | Movie recommendations |
| POST | `/reviews` | Submit a review |
| GET | `/reviews/my-reviews` | Authenticated user's reviews |
| GET/POST | `/watchlist` | Manage watchlist |
| GET/POST | `/favorites` | Manage favourites |
| GET | `/users/me` | Current user profile |
| GET | `/users/me/stats` | Viewing stats & taste card |
| GET | `/admin/users` | Admin: list users |
| GET | `/admin/audit-log` | Admin: security audit log |

---

## Running Tests

```bash
cd back-end
pytest tests/ -v
```
