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

> **Just want to run the app?** `docker compose up --build` from the repository root runs the database, backend and frontend together, with no Python setup needed. See [`docs/08-devops/deployment-guide.md`](../docs/08-devops/deployment-guide.md#3-full-stack-with-docker-compose-m5). The steps below are for developing the backend on your computer.

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

## Subscriptions (#97)

| Endpoint | Does | Errors |
|---|---|---|
| `POST /api/v1/subscriptions` | Subscribe for `WEEK` (7), `HALF_MONTH` (15) or `MONTH` (30) days from `start_date` (tomorrow … +30 days), `every_n_days` 1/2/3 (#99), `delivery_slot_id` (#100) | `401`, `400`, `404`, `409 SUBSCRIPTION_ALREADY_ACTIVE` / `DELIVERY_SLOT_FULL` / `PRODUCT_UNAVAILABLE` / `INSUFFICIENT_STOCK`, `422` |
| `GET /api/v1/subscriptions/mine` | My subscriptions, newest first | `401` |
| `GET /api/v1/subscriptions/{id}` | One subscription (owner or ADMIN) | `401`, `404` |
| `POST /api/v1/subscriptions/{id}/cancel` | Cancel (owner or ADMIN) | `401`, `404`, `409 SUBSCRIPTION_NOT_ACTIVE` |
| `GET /api/v1/admin/subscriptions?status=` | All subscriptions (ADMIN) | `401`, `403` |
| `PATCH /api/v1/subscriptions/{id}/delivery-slot` | Change the delivery time (#100) | `401`, `404`, `409 SUBSCRIPTION_NOT_ACTIVE` / `DELIVERY_SLOT_FULL`, `422` |
| `GET /api/v1/delivery-slots` | Active delivery slots with places left (public, #100) | |
| `GET/POST /api/v1/admin/delivery-slots`, `PATCH/DELETE …/{id}` | Manage delivery slots (ADMIN, #100) | `401`, `403`, `404`, `409 DELIVERY_SLOT_ALREADY_EXISTS` / `DELIVERY_SLOT_IN_USE` / `LAST_ACTIVE_DELIVERY_SLOT`, `422` |

- **Delivery orders are automatic (#99, ADR-015):** when the server starts, `app/core/background.py` starts an `asyncio` task that runs `generate_orders_for(today)` at once and then every `SUBSCRIPTION_ORDERS_INTERVAL_MINUTES` (default 15). Turn it off with `SUBSCRIPTION_AUTO_ORDERS=false` (tests do). Errors are logged and retried next time. Manual backup, e.g. for a day the server was off:
  ```
  python -m app.scripts.generate_subscription_orders              # today, India time
  python -m app.scripts.generate_subscription_orders --date 2026-11-21
  ```
  `generate_orders_for(day)` in `app/services/subscription_service.py` creates one normal order per ACTIVE subscription that **delivers** that day (inside its dates and on its every-n-days rhythm) (locked prices, stock reduced). It is safe to run twice: `uq_orders_subscription_day` refuses a second order for the same subscription and day. Each subscription runs in its own SAVEPOINT, so one out-of-stock product only skips that subscription.
- **"Today"** is the date in India (fixed UTC+05:30 offset, no daylight saving), not the server's time zone.
- **One active subscription per user** is a partial unique index (`WHERE status = 'ACTIVE'`), so even two requests at the same moment cannot both create one.
- Shared item checks (duplicates, unavailable, stock) live in `order_service.check_items`, used by both orders and subscriptions.
- **Frequency (#99):** `every_n_days` 1, 2 or 3; deliveries = `(days − 1) // every_n_days + 1`; `plan_total = daily_total × deliveries`.
- **Delivery slots (#100):** rules in `app/services/delivery_slot_service.py`. Booking (subscribe or change time) locks the slot row (`SELECT … FOR UPDATE`) and counts its ACTIVE subscriptions against `capacity`, so a slot is never overbooked. Switching off or deleting first locks all active slots in id order (no deadlock) and refuses to leave none. Orders get a text copy of the slot (`orders.delivery_slot`). The migration creates the standard Morning 08:00–09:00 and Evening 17:00–18:00 slots.
- Tests: `tests/test_subscription_service.py` (fixed dates), `tests/api/test_subscriptions.py`, `tests/test_background.py` (the loop), `tests/test_delivery_slot_service.py` and `tests/api/test_delivery_slots.py` (#100).

## Income (#105)

`GET /api/v1/admin/income?from=YYYY-MM-DD&to=YYYY-MM-DD` (ADMIN): the Income tab's data. Income = DELIVERED orders, counted on the delivery day (`IncomeRepository.DELIVERY_DAY`: `delivery_date` for subscription orders, else `timezone('Asia/Kolkata', order_date)::date`), compared with the previous period of the same length. All figures come from a few grouped queries in `app/repositories/income_repository.py`; `app/services/income_service.py` adds them up (litres from product sizes, shares, growth, insights). Max 366 days. Tests: `tests/test_income_service.py`.

## Delivery boys (#103)

| Endpoint | Does | Errors |
|---|---|---|
| `GET/POST /api/v1/admin/delivery-boys` | List (with areas and `today_orders`) / add | `401`, `403`, `409 DELIVERY_BOY_ALREADY_EXISTS`, `422` |
| `PATCH/DELETE /api/v1/admin/delivery-boys/{id}` | Edit / delete (frees his areas) | `401`, `403`, `404`, `409`, `422` |
| `POST /api/v1/admin/delivery-boys/{id}/areas`, `DELETE …/areas/{pincode}` | Allocate / remove a PIN code | `401`, `403`, `404`, `409 AREA_ALREADY_ALLOCATED`, `422` |

- One delivery boy per PIN code (`uq_delivery_areas_pincode`). Delivery boys are admin records, not users (no login).
- Orders and subscriptions copy the address's PIN code (`delivery_pincode`, from `address_service.delivery_copy_for`). The Orders board (`GET /admin/orders`, #104) matches each order to the ACTIVE delivery boy for its PIN code (`DeliveryBoyRepository.active_allocation`, one query) and filters by `boy` (id or `"unassigned"`); `delivery_service.todays_orders_per_boy` feeds the cards' "Today" count.
- Rules: `app/services/delivery_boy_service.py`. Tests: `tests/api/test_delivery_boys.py`.

## Addresses (#102)

| Endpoint | Does | Errors |
|---|---|---|
| `GET /api/v1/addresses` | My saved addresses, default first | `401` |
| `POST /api/v1/addresses` | Add (the first becomes the default) | `401`, `409 ADDRESS_LIMIT_REACHED`, `422` |
| `PATCH /api/v1/addresses/{id}`, `POST …/{id}/default`, `DELETE …/{id}` | Edit, make default, delete | `401`, `404`, `422` |
| `PATCH /api/v1/subscriptions/{id}/address` | Deliver a subscription to another saved address (owner) | `401`, `404`, `409`, `422` |

- `POST /orders` and `POST /subscriptions` take `address_id` (left out → the default). `address_service.delivery_text_for` returns the address text to copy, or raises 422 on `address_id` ("required" when the user has none, "not available" when it is not theirs). Orders, subscriptions and automatic subscription orders store the copy in `delivery_address`.
- One default per user is a partial unique index; changing the default locks the user's addresses and clears the old default (flush) before setting the new one.
- Test users from `tests/factories.make_user` get a default address (`with_address=False` for none). Tests: `tests/api/test_addresses.py`.

## Admin Orders board and user details (#101, #104)

| Endpoint | Does | Errors |
|---|---|---|
| `GET /api/v1/admin/orders?status=&date=&boy=&q=&page=&page_size=` | *(#104)* Orders board: cards with items, delivery boy and PIN; status counts (ignore `status`), per-boy counts | `401`, `403`, `422` |
| `GET /api/v1/admin/users/{id}` | User + `order_count` + `total_spent` (not cancelled) | `401`, `403`, `404` |
| `GET /api/v1/admin/users/{id}/orders` | All of the user's orders, newest first | `401`, `403`, `404` |

- A day = subscription orders with `delivery_date = day` + one-time orders whose `order_date` falls in that India day (`app/core/india_time.india_day_range`: 00:00 IST = 18:30 UTC the day before). The filters are SQL conditions in `OrderRepository._admin_query` (`AdminOrderFilters`); a page loads customer, items and products eagerly plus the username; `count_by_status(filters)` and `boy_counts(filters)` are grouped queries. `GET /admin/deliveries` (#101) was removed in #104.
- Rules in `app/services/order_service.list_admin_orders` and `app/services/user_service.py`. Tests: `tests/test_admin_order_board.py`, `tests/api/test_admin_deliveries_and_users.py`.

## Stock (#92)

- `products.stock_quantity` = bottles left. **Admins only** see the number (`GET /api/v1/admin/products`, admin create/edit responses, and the `stock_quantity` field there). Public product responses only carry `in_stock` (true/false).
- `create_order` locks the ordered products (`ProductRepository.get_many_for_update`, `SELECT … FOR UPDATE`, always in `product_id` order to avoid deadlocks), refuses a quantity above the stock with `409 INSUFFICIENT_STOCK` (the message never says how many are left), and reduces the stock in the same transaction as the order.
- `update_status(…, CANCELLED)` adds the quantities back. Delivering does not change stock.
- The seed gives each catalogue product 100 (`SEED_STOCK`); the migration gave products that already existed 100; new products default to 0 until the admin sets it.

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
pytest --cov                          # with coverage (settings in pyproject.toml, incl. branches)
coverage report --include="app/services/*" --fail-under=70   # the service-layer gate CI uses
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
| `ruff check .` | Lint: rules E, F, I, B, UP (pyflakes, import order, likely bugs, modern syntax), line length 100 |
| `ruff check --fix .` | Lint and fix what can be fixed automatically |
| `ruff format .` | Format all files (`ruff format --check .` only reports; CI uses that) |
| `pytest --cov` then `coverage report --include="app/services/*" --fail-under=70` | Coverage, and the ≥ 70 % service-layer minimum (NFR-12) that CI enforces |

Ruff and coverage are configured in `pyproject.toml` (#51, #53). CI fails if Ruff reports anything, if a file is not formatted, or if service coverage drops below 70 %.

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
