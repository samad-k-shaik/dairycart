# backend/

FastAPI application (Python 3.12). Scaffolded in M1-01 (#9): a runnable app with pinned dependencies. Settings, logging, database and routers are added by the next M1 issues.

## Setup and run (7 steps)

**Prerequisite:** Python **3.12** (`python3 --version` on macOS/Linux, `py -3.12 --version` on Windows).

| # | macOS / Linux | Windows (PowerShell) |
|---|---|---|
| 1 | `cd backend` | `cd backend` |
| 2 | `python3.12 -m venv .venv` | `py -3.12 -m venv .venv` |
| 3 | `source .venv/bin/activate` | `.venv\Scripts\Activate.ps1` |
| 4 | `pip install -r requirements.txt -r requirements-dev.txt` | same |
| 5 | `uvicorn app.main:app --reload --port 8000` | same |
| 6 | Open http://localhost:8000/docs (interactive API docs) | same |
| 7 | Run the tests: `pytest` | same |

Check it works: `curl http://localhost:8000/` returns `{"name":"Milk Delivery POC API"}`.

- `.venv/` is your private copy of the packages; it is git-ignored. Activate it (step 3) in every new terminal.
- If PowerShell refuses to run `Activate.ps1`, run once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
- `--reload` restarts the server when you save a file. Use it only for development (it watches files and costs resources); production runs without it.

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
