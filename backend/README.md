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
| 5 | `cp .env.example .env`, put your own random `JWT_SECRET_KEY` in it (see *Login and admin accounts*), start PostgreSQL (see *Local database*) | `copy .env.example .env`, same |
| 6 | `alembic upgrade head` (tables), then `python -m app.scripts.seed` (products), then create an admin: `python -m app.scripts.create_admin --username admin --email admin@example.com --full-name "Dairy Admin"` | same |
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

## Health check (M1-09)

`GET /api/v1/health` (all endpoints live under `/api/v1`; routers are in `app/routers/` and mounted in `main.py`):

| Database | Status | Body |
|---|---|---|
| answers `SELECT 1` | 200 | `{"status": "ok", "database": "ok", "version": "0.1.0"}` |
| unreachable | 503 | `{"status": "degraded", "database": "unavailable", "version": "0.1.0"}` |

- It is a **readiness** check (can the app serve requests?), used by Docker, Cloud Run and smoke tests. It recovers automatically when the database comes back.
- Only the error type is logged (`database health check failed: OperationalError`), never connection details. Responses are `Cache-Control: no-store`.
- The engine gives up connecting after 5 s (`connect_timeout`). On Windows, `localhost` has two addresses (IPv6 and IPv4), so a stopped local database can take ~10 s to report 503; on Linux/Docker/Cloud Run a refused connection fails immediately.
- The version comes from `app/__init__.py` (`__version__`). The temporary `GET /` from M1-01 was removed.

## Products API and the layers (M1-10)

| Endpoint | Returns |
|---|---|
| `GET /api/v1/products` | Available products ordered by `product_id`; `[]` if none |
| `GET /api/v1/products?include_unavailable=true` | All products, including unavailable ones (admin view, ADR-006) |
| `GET /api/v1/products/{product_id}` | One product; `404 NOT_FOUND` if unknown; `422` for `0`, negative or non-numeric ids |

Every endpoint follows the same path through the layers:

```text
routers/products.py          HTTP only: validate ?include_unavailable and /{product_id}, return ProductRead
  → services/product_service.py      business rules: missing product → NotFoundError (404)
    → repositories/product_repository.py   the only place with SQLAlchemy queries
      → models/product.py → PostgreSQL
```

- Response schemas live in `app/schemas/`. `ProductRead` has exactly the contract's fields and is built from the model with `from_attributes`.
- **Money is sent as a string with 2 decimals** (`"60.00"`) using the shared `Money` type in `app/schemas/common.py`: JSON numbers become floats in JavaScript and can lose precision.
- Unavailable products are still returned by the details endpoint; refusing to *order* them is the order service's job (409, M3).

## Admin product management (#86)

| Endpoint | Does | Errors |
|---|---|---|
| `POST /api/v1/admin/products` | Add a product → `201` | `409 PRODUCT_ALREADY_EXISTS`, `422` |
| `PATCH /api/v1/admin/products/{product_id}` | Change only the fields sent → `200` | `404`, `409 PRODUCT_ALREADY_EXISTS`, `422` |
| `DELETE /api/v1/admin/products/{product_id}` | Delete → `204` (no body) | `404`, `409 PRODUCT_IN_USE` |

Try it in `/docs`, or:

```bash
curl -X POST http://localhost:8000/api/v1/admin/products \
  -H "Content-Type: application/json" \
  -d '{"name": "Toned Milk", "size": "500 ml", "price": "28.50"}'
```

How the rules are split across the layers:

- **Schemas** (`ProductCreate`, `ProductUpdate` in `app/schemas/product.py`) check the *shape*: name 2–100 and size 1–20 characters (spaces trimmed), price a **string** with up to 2 decimals and more than 0, no unknown fields. PATCH needs at least one field and refuses `null`.
- **Service** (`app/services/product_service.py`) checks the *business rules*: name + size must be unique ignoring case (BR-8), and a product that was ever ordered cannot be deleted (BR-7). The service also **commits**: one admin action = one transaction.
- **Repository** only runs queries (`find_by_name_and_size`, `is_ordered`, `add`, `delete`) and never commits.
- The database constraints (`uq_products_name_size`, `ON DELETE RESTRICT`) are the last safety net: if two requests race past the service checks, the `IntegrityError` is turned into the same `409` instead of a `500`.
- Editing a price never changes old orders, because each order item stores its own `unit_price` (BR-1).

> **Windows note:** `uvicorn --reload` sometimes fails to restart its worker after a code change (the log shows "Reloading..." but the old code keeps answering, e.g. new endpoints return 404). Stop the server with Ctrl+C and start it again.

## Orders API (M3-01 to M3-07)

| Endpoint | Does | Errors |
|---|---|---|
| `POST /api/v1/orders` | Place an order (login required, #90) → `201` + `Location: /api/v1/orders/{id}` | `401`, `400 DUPLICATE_PRODUCT`, `404`, `409 PRODUCT_UNAVAILABLE`, `422` |
| `GET /api/v1/orders/mine` | The logged-in user's orders, newest first (#90) | `401` |
| `GET /api/v1/orders/{order_id}` | One order with items (owner or ADMIN only, #90) | `401`, `404` (also for someone else's order) |
| `GET /api/v1/admin/orders?status=&page=&page_size=` | One page (newest first, `page_size` ≤ 100) + `status_counts` for all orders | `422` |
| `PATCH /api/v1/admin/orders/{order_id}/status` | Next status, only along the allowed transitions | `404`, `409 INVALID_STATUS_TRANSITION`, `422` |

What makes the order code safe:

- **Prices come from the database, never the request.** `OrderCreate` forbids unknown fields, so sending `price` or `total_amount` is a `422`. The service copies each product's current price into `unit_price` (a snapshot, BR-1) and calculates `subtotal` and `total_amount` with `Decimal`.
- **One transaction.** Customer (found or created by phone), order and items are saved with one `commit()`. Any error rolls everything back: a failed order leaves no rows behind.
- **Status rules** live in one dict, `ALLOWED_TRANSITIONS` in `app/services/order_service.py` (5 arrows: PLACED → CONFIRMED/CANCELLED, CONFIRMED → OUT_FOR_DELIVERY/CANCELLED, OUT_FOR_DELIVERY → DELIVERED). The order row is locked (`SELECT … FOR UPDATE`) while it is checked and saved, so two admins cannot both change it.
- **No N+1 queries.** An order is loaded with its customer, items and products in 2 queries (`joinedload` + `selectinload`); a test counts them.
- **Who sees what (#89, #90):** ordering needs a logged-in user, and the order is saved with `orders.user_id`. An order is visible only to its owner and to admins; anyone else gets the same `404` as for a missing order. The old phone lookup was removed.

## CORS (M3-08)

The browser only lets the frontend (`http://localhost:5173`, another origin) call this API because `CORSMiddleware` allows the origins listed in **`CORS_ORIGINS`** (`backend/.env`, comma-separated). `*` is refused when the settings load. A page opened from any other origin, even `http://127.0.0.1:5173`, cannot read the responses. Add an origin there if you open the frontend from another address.

## Login and admin accounts (#89)

| Endpoint | Does | Errors |
|---|---|---|
| `POST /api/v1/auth/register` | Sign up → `201`, always role `USER` | `409 USER_ALREADY_EXISTS`, `422` |
| `POST /api/v1/auth/login` | Username or email + password → `access_token` (JWT) | `401` (one message for unknown user and wrong password) |
| `GET /api/v1/auth/me` | The logged-in user | `401` |
| `GET /api/v1/admin/users` | Every user (ADMIN only) | `401`, `403` |

**Every `/api/v1/admin/*` endpoint needs an ADMIN token** (orders, products and users): `401` without one, `403` for a `USER`. In `/docs`, log in with `POST /auth/login`, copy `access_token`, click **Authorize** and paste it.

**Create an admin** (the API never gives the ADMIN role):

```bash
python -m app.scripts.create_admin --username admin --email admin@example.com --full-name "Dairy Admin"
#   asks for the password twice (not shown, not saved in your shell history)
python -m app.scripts.create_admin --promote ravi_k     # make an existing user an admin
```

**`JWT_SECRET_KEY`** (required, at least 32 characters) signs the tokens. Anyone who knows it can create a token for any user, including an admin, so: random, secret, never committed, different per environment. Make one with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

How it works (`app/core/security.py`, `app/core/auth.py`):

- **Passwords** are stored as **bcrypt** hashes (salted, deliberately slow, cost 12). Login hashes the typed password and compares. An unknown username still runs one bcrypt check, so response times don't reveal which accounts exist.
- **Tokens** are signed JWTs with the user id (`sub`) and an expiry (`exp`). Changing any character breaks the signature; only HS256 is accepted (so an unsigned `"alg": "none"` token is refused).
- **`get_current_user`** reads `Authorization: Bearer …`, checks the token, and loads the user **from the database**. **`require_admin`** then checks the role. A demoted admin loses access at once.
- **Logout** happens in the browser (the token is deleted). The server keeps no sessions, so a copied token stays valid until it expires (`JWT_EXPIRE_MINUTES`, default 60).
- Tests use bcrypt cost 4 (faster) and a fixed test secret (`tests/conftest.py`); `admin_client` sends requests as a logged-in admin.

## Tests (M1-11)

```bash
pytest                                # all tests
pytest -q                             # short output
pytest tests/api/test_products.py     # one file
pytest -k products                    # tests whose name contains "products"
pytest --cov=app                      # with coverage
```

- **Real PostgreSQL, never the dev database.** Tests use `TEST_DATABASE_URL` (default `postgresql+psycopg://milk_user:…@localhost:5432/milk_delivery_test`). It is forced into `DATABASE_URL` before the app loads, so your `.env` is ignored, and pytest refuses to start unless the database name ends in `_test`. Create the test database once (see *Local database*).
- **Migrations once per run:** the `migrated_db` fixture runs `alembic upgrade head` at the start and `downgrade base` at the end.
- **Isolation:** `db_session` wraps each test in a transaction that is always rolled back (even `commit()` inside a service only releases a savepoint), so tests never see each other's data and can run in any order.
- **API tests:** the `client` fixture is a `TestClient` for the real app whose endpoints use the test's `db_session` (`app.dependency_overrides[get_db]`).
- **Test data:** `tests/factories.py` has `make_product`, `make_customer` and `make_order` with sensible defaults and unique names/phones.
- If PostgreSQL is not running, database tests are skipped with a message; the rest still run.
- SQLAlchemy warnings fail the test run (`pyproject.toml`), because they usually point to a real mistake.
- Layout: `tests/api/` calls HTTP endpoints; the other files test settings, database, models, migrations and the seed script.

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
