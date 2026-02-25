FROM python:3.11-slim

# System libraries required by torch, faiss, and psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgomp1 \
        libpq-dev \
        gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (separate layer — cached until requirements.txt changes)
COPY requirements.txt .
# Install CPU-only torch first to avoid pulling the massive CUDA build (~2 GB)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY app/ ./app/

# Copy pre-built FAISS index files
COPY data/ ./data/

# Ensure log directory exists
RUN mkdir -p logs

EXPOSE 8000

# Single worker — avoids loading 3 AI models N times in RAM
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--proxy-headers", "--forwarded-allow-ips=*"]
