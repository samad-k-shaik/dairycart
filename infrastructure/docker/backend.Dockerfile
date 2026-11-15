# Backend image (#56): FastAPI app for Docker Compose (M5) and Cloud Run (M6).
#
# Build from the repository root:
#   docker build -f infrastructure/docker/backend.Dockerfile -t dairycart-backend backend
#
# Two stages:
#   1. "builder" installs the Python packages into a virtual environment.
#   2. The final image copies only that environment + the app code.
#      pip, its cache and build leftovers stay behind in stage 1, so the image is smaller.

# ---------- Stage 1: install dependencies ----------
FROM python:3.12-slim AS builder

# Packages go into /opt/venv so stage 2 can copy them in one step.
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy ONLY requirements.txt first. Docker caches each step ("layer"): while
# requirements.txt is unchanged, this slow install is reused even when app code changes.
# requirements-dev.txt (pytest, coverage…) is NOT installed: production needs runtime packages only.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


# ---------- Stage 2: the image that actually runs ----------
FROM python:3.12-slim

# PYTHONDONTWRITEBYTECODE: no .pyc files in the container.
# PYTHONUNBUFFERED: logs appear immediately (needed for `docker compose logs` and Cloud Logging).
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

# A normal user without admin rights. If someone breaks into the app, they are not root.
RUN useradd --system --uid 10001 --no-create-home app

WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
# App code, Alembic migrations and alembic.ini (see backend/.dockerignore for what is left out).
COPY --chown=app:app . .

USER app

# Documentation only: the port the app listens on by default.
EXPOSE 8000

# Cloud Run tells the app which port to use through $PORT; locally it is 8000.
# `sh -c` is needed so ${PORT:-8000} is filled in; `exec` makes uvicorn the main process,
# so it receives Docker's stop signal and shuts down cleanly.
# Migrations are NOT run here: in Compose they run once before start (docker-compose.yml).
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
