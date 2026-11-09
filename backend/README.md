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
| 5 | `cp .env.example .env`, start PostgreSQL (see *Local database*) | `copy .env.example .env`, same |
| 6 | `alembic upgrade head` (tables), then `python -m app.scripts.seed` (products) | same |
| 7 | `uvicorn app.main:app --reload --port 8000`, then open http://localhost:8000/docs | same |
| 8 | Run the tests: `pytest` | same |

Check it works: `curl http://localhost:8000/` returns `{"name":"Milk Delivery POC API"}`.

- `.venv/` is your private copy of the packages; it is git-ignored. Activate it (step 3) in every new terminal.
- If PowerShell refuses to run `Activate.ps1`, run once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
- `--reload` restarts the server when you save a file. Use it only for development (it watches files and costs resources); production runs without it.

## Local database (PostgreSQL 16)

The backend needs PostgreSQL with user `milk_user`, password `milk_password_local_only` (local only) and database `milk_delivery`, matching `DATABASE_URL` in `.env.example`. Tests use a second database, `milk_delivery_test`.

**Option A: Docker (project default).** From the repository root:

```bash
docker compose up -d db                                                     # start
docker compose exec db createdb -U milk_user milk_delivery_test             # once: test database
docker compose ps                                                           # "healthy" = ready
docker compose down                                                         # stop (data is kept)
```

**Option B: portable PostgreSQL on Windows (no Docker, no admin rights).** Download the PostgreSQL 16 "binaries" zip for Windows from [EnterpriseDB](https://www.enterprisedb.com/download-postgresql-binaries) (linked from postgresql.org), unzip it, then in PowerShell:

```powershell
$pg = "$env:LOCALAPPDATA\dairycart-postgres"          # where you unzipped it (contains pgsql\bin)
$bin = "$pg\pg16\pgsql\bin"
# once: create the data folder and the milk_user login (enter milk_password_local_only twice)
& "$bin\initdb.exe" -D "$pg\data" -U milk_user -W -E UTF8 --no-locale --auth=scram-sha-256
# every time you work on the backend:
& "$bin\pg_ctl.exe" -D "$pg\data" -l "$pg\postgres.log" -w start
# once: create the two databases
$env:PGPASSWORD = "milk_password_local_only"
& "$bin\createdb.exe" -h localhost -U milk_user milk_delivery
& "$bin\createdb.exe" -h localhost -U milk_user milk_delivery_test
# when finished:
& "$bin\pg_ctl.exe" -D "$pg\data" stop
```

It listens on `localhost:5432` only. Tables are created by Alembic migrations (M1-06), never by the application code.

## Database access (M1-04)

- `app/database/base.py`: `Base` for all models, with a naming convention so every constraint has a predictable name (`ck_order_items_quantity_range`, `uq_products_name_size`, …).
- `app/database/session.py`: one `engine` per process (connection pool, `pool_pre_ping=True`, `hide_parameters=True` so query values such as phone numbers never appear in errors), `SessionLocal`, and the `get_db()` dependency.
- Endpoints get a session with `db: Annotated[Session, Depends(get_db)]`. Each request gets its own session, and it is always closed afterwards, even when the endpoint raises.
- `postgresql://` URLs are switched to `postgresql+psycopg://` (psycopg 3, ADR-007).
- Database tests are skipped with a clear message if PostgreSQL is not running.

## Errors (M1-08)

Every error response uses the format from `docs/05-api/api-contracts.md#error-format`:

```json
{"error": {"code": "NOT_FOUND", "message": "Product 99 was not found.", "details": [], "request_id": "e4df5fec-…"}}
```

- **Services raise domain exceptions** from `app/core/errors.py`; they never build HTTP responses:

  | Exception | HTTP | `code` |
  |---|---|---|
  | `NotFoundError` | 404 | `NOT_FOUND` |
  | `ProductUnavailableError` | 409 | `PRODUCT_UNAVAILABLE` |
  | `InvalidStatusTransitionError` | 409 | `INVALID_STATUS_TRANSITION` |
  | `DuplicateProductError` | 400 | `DUPLICATE_PRODUCT` |
  | FastAPI `RequestValidationError` | 422 | `VALIDATION_ERROR` (`details` lists paths like `items[0].quantity`) |
  | Unknown URL / wrong method | 404 / 405 | `NOT_FOUND` / `METHOD_NOT_ALLOWED` |
  | Any other exception | 500 | `INTERNAL_ERROR` |

  Example: `raise ProductUnavailableError("Product 'Buffalo Milk 1 Litre' is currently unavailable.", details=[ErrorDetail(field="items[1].product_id", issue="unavailable")])`.
- `register_error_handlers(app)` in `main.py` installs the handlers. The response schema is `app/schemas/common.py` (`ErrorResponse`).
- **500s** return only a generic message. The full traceback is logged (`logger.exception`) with the request ID, which is also in the response body and `X-Request-ID` header, so a reported error can be found in the logs.
- Validation details never include the submitted value (it could be a phone number).

## Models (M1-05)

`app/models/` holds one SQLAlchemy model per table, matching `docs/04-architecture/database-erd.md` exactly (and `database/init.sql`):

| Model | Table | Relationships |
|---|---|---|
| `Customer` | `customers` | `orders` |
| `Product` | `products` | `order_items` |
| `Order` | `orders` | `customer`, `items` (deleting an order deletes its items) |
| `OrderItem` | `order_items` | `order`, `product` |

- SQLAlchemy 2.0 typed style: `Mapped[...]` + `mapped_column(...)`.
- Money is `Numeric(10, 2)` in the database and `Decimal` in Python, never `float`.
- `OrderStatus` is a `StrEnum` (`PLACED`, `CONFIRMED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`), stored as `VARCHAR(20)` with the CHECK constraint `ck_orders_status_allowed` rather than a native PostgreSQL enum.
- All constraints are named (see the ERD's "Constraint names"). `app/models/__init__.py` imports every model so Alembic (M1-06) finds all tables.
- Reprs never include phone numbers (they end up in logs).

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
