# backend/

FastAPI application (Python 3.12). Scaffolded in M1-01 (#9): a runnable app with pinned dependencies. Settings, logging, database and routers are added by the next M1 issues.

## Setup and run (8 steps)

**Prerequisite:** Python **3.12** (`python3 --version` on macOS/Linux, `py -3.12 --version` on Windows).

| # | macOS / Linux | Windows (PowerShell) |
|---|---|---|
| 1 | `cd backend` | `cd backend` |
| 2 | `python3.12 -m venv .venv` | `py -3.12 -m venv .venv` |
| 3 | `source .venv/bin/activate` | `.venv\Scripts\Activate.ps1` |
| 4 | `pip install -r requirements.txt -r requirements-dev.txt` | same |
| 5 | `cp .env.example .env` | `copy .env.example .env` |
| 6 | `uvicorn app.main:app --reload --port 8000` | same |
| 7 | Open http://localhost:8000/docs (interactive API docs) | same |
| 8 | Run the tests: `pytest` | same |

Check it works: `curl http://localhost:8000/` returns `{"name":"Milk Delivery POC API"}`.

- `.venv/` is your private copy of the packages; it is git-ignored. Activate it (step 3) in every new terminal.
- If PowerShell refuses to run `Activate.ps1`, run once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
- `--reload` restarts the server when you save a file. Use it only for development (it watches files and costs resources); production runs without it.

## Configuration (environment variables)

Settings are loaded by `app/core/config.py` (`Settings`, `pydantic-settings`) and read through `get_settings()`. Values come from, in order of priority:

1. **Real environment variables** (your shell, Docker, CI, Cloud Run).
2. **`backend/.env`**: a local file you create from `.env.example`. It is **git-ignored**; never commit it.
3. **Defaults** (only for non-secret values).

| Variable | Required | Default | Example (local) | Used for |
|---|---|---|---|---|
| `DATABASE_URL` | **yes** | – | `postgresql+psycopg://milk_user:milk_password_local_only@localhost:5432/milk_delivery` | SQLAlchemy connection (M1-04). Must start with `postgresql+psycopg://` (or `postgresql://`). Contains the password: stored as a secret and never printed. |
| `CORS_ORIGINS` | no | `http://localhost:5173` | `http://localhost:5173,https://milk.example.com` | Frontend origins allowed to call the API (M3-08). Comma-separated. |
| `LOG_LEVEL` | no | `INFO` | `DEBUG` | `DEBUG`, `INFO`, `WARNING`, `ERROR` or `CRITICAL` (any case). |
| `APP_ENV` | no | `local` | `production` | `local`, `test` or `production`. |

- **Fail fast:** `app/main.py` reads the settings on startup. If `DATABASE_URL` is missing or invalid, the server does not start and prints which variable is wrong (never its value), e.g. `- DATABASE_URL is not set`.
- **Cached:** `get_settings()` reads and validates the settings once, then returns the same object (`functools.lru_cache`). Tests call `get_settings.cache_clear()` to start fresh.
- `.env` is read from the folder you start the server in, so run commands from `backend/`.
- The password in `.env.example` is the local Docker Compose one. Never use it outside local development; production values come from the environment (Cloud Run with Secret Manager, M6).

## Logging and request IDs (M1-03)

`app/core/logging.py` writes **one JSON line per request** to stdout (Cloud Logging reads stdout on Cloud Run, M6):

```json
{"timestamp": "2026-11-09T07:02:01.113422+00:00", "severity": "INFO", "logger": "app.request", "message": "request completed", "request_id": "e5fc3ffe-0b8a-459f-9383-f30bf5e16bc1", "method": "GET", "path": "/", "status_code": 200, "duration_ms": 2.61}
```

- **Request ID:** `RequestIdMiddleware` reuses an incoming `X-Request-ID` header if it is plain text (letters, digits, `-`, `_`, `.`, up to 128 characters), otherwise creates a UUID4. It is stored on `request.state.request_id`, returned in the `X-Request-ID` response header and added to every log line written during that request. Error responses will include it as `request_id` (M1-08), so a reported error can be found in the logs.
- **Privacy:** request bodies and query strings are never logged (they can contain phone numbers, e.g. `/orders?phone=…`). Only the path is logged.
- **Level:** controlled by `LOG_LEVEL`. Uvicorn's own messages are JSON too; its plain-text access log is turned off because the middleware already writes one line per request.
- No logging library is used (plain `logging` + `json`); adding one needs an ADR.

## Dependencies

| File | Contains | Installed in |
|---|---|---|
| `requirements.txt` | What the app needs to **run**: FastAPI, Uvicorn, Pydantic, pydantic-settings, SQLAlchemy, psycopg 3, Alembic | development, CI, Docker image |
| `requirements-dev.txt` | Developer-only tools: pytest, httpx, pytest-cov, Ruff | development and CI only |

All versions are pinned with `==`, so everyone installs exactly the same packages. Upgrade a version only in its own PR, after running the tests.

Note: FastAPI's `TestClient` currently prints a `StarletteDeprecationWarning` suggesting `httpx2` instead of `httpx`. Tests pass; `httpx` is kept because it is the tool named in ADR-009. Revisit when the test setup is finalised (M1-11 / M4).

## Useful commands

| Command | What it does |
|---|---|
| `uvicorn app.main:app --reload --port 8000` | Start the dev server |
| `pytest` | Run the tests in `tests/` (configured in `pyproject.toml`) |
| `ruff check .` | Lint |
| `ruff format .` | Format |

## Folder structure

| Folder | Responsibility |
|---|---|
| `app/main.py` | Creates the FastAPI `app` (later: includes routers, CORS, error handlers) |
| `app/core` | Settings (env vars), logging, error handlers |
| `app/database` | Engine, session factory, `get_db` dependency, declarative `Base` |
| `app/models` | SQLAlchemy ORM models (tables) |
| `app/schemas` | Pydantic request/response models |
| `app/routers` | HTTP endpoints only, no business logic |
| `app/services` | Business rules (order totals, status transitions) |
| `app/repositories` | Database queries |
| `tests` | pytest tests |
| `alembic` | Database migrations |

Request flow: `router → service → repository → model → PostgreSQL`. See `docs/04-architecture/low-level-design.md`.
