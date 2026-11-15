# Deployment Guide

> **Status: planning document.** Nothing is deployed in M0. Local setup steps become runnable during M1/M2; Docker during M5; GCP during M6. Each step will be verified and updated by the issue that implements it.

## 1. Prerequisites (developer machine)

| Tool | Version |
|---|---|
| Git | 2.40+ |
| Python | 3.12 |
| Node.js | 20 LTS |
| Docker Desktop / Engine + Compose v2 | latest stable |
| gcloud CLI | M6 only |

## 2. Local development (from M1/M2)

```bash
git clone <repository-url>
cd milk-delivery-poc

# Database
docker compose up -d db

# Backend (M1)
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 8000
# → http://localhost:8000/docs

# Frontend (M2)
cd ../frontend
npm install
cp .env.example .env      # VITE_API_BASE_URL=http://localhost:8000/api/v1
npm run dev
# → http://localhost:5173
```

### Environment variables

Every setting the app reads (#59). Copy `backend/.env.example` → `backend/.env` and `frontend/.env.example` → `frontend/.env.local` to change them; both files are git-ignored. Docker Compose sets the backend values itself (see section 3).

**Backend** (`backend/.env`, read by `app/core/config.py`; the app refuses to start if a required value is missing or invalid):

| Variable | Required | Default / example | What it does |
|---|---|---|---|
| `DATABASE_URL` | ✅ | `postgresql+psycopg://milk_user:milk_password_local_only@localhost:5432/milk_delivery` | PostgreSQL connection. Treated as secret: never logged |
| `JWT_SECRET_KEY` | ✅ | none. Generate: `python -c "import secrets; print(secrets.token_urlsafe(48))"` | Signs login tokens; at least 32 characters. **Secret** |
| `CORS_ORIGINS` | | `http://localhost:5173` | Frontend addresses allowed to call the API (comma-separated) |
| `JWT_EXPIRE_MINUTES` | | `60` | How long a login stays valid (5–1440) |
| `SUBSCRIPTION_AUTO_ORDERS` | | `true` | Create subscription delivery orders automatically |
| `SUBSCRIPTION_ORDERS_INTERVAL_MINUTES` | | `15` | How often (1–1440) |
| `LOG_LEVEL` | | `INFO` | `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL` |
| `APP_ENV` | | `local` | `local`, `test` or `production` |
| `TEST_DATABASE_URL` | | `…/milk_delivery_test` | Test database for `pytest`; the name must end in `_test` |
| `ADMIN_PASSWORD` | | none | Lets `create_admin` run without a password prompt (Compose, automation) |

**Frontend** (`frontend/.env.local`; Vite bakes these in at **build** time):

| Variable | Default | What it does |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` | Backend address the browser calls |
| `VITE_USE_MOCKS` | `false` | `true` = use the M2 mock data instead of the backend |

**Secrets rule:** real secrets never go into Git. Local values are marked `local_only`, CI values `ci-only`. Production secrets (M6) live in GCP Secret Manager. GitHub **secret scanning** and **push protection** are enabled, so a push containing a recognised key (cloud, GitHub token…) is blocked. The full history was searched for secrets on 2026-11-15 (#59): none were found.

## 3. Full stack with Docker Compose (M5)

One command starts the database, backend and frontend (#58). Only Docker Desktop is needed; Python and Node run inside the containers.

```bash
docker compose up --build      # build images and start everything (add -d to run in the background)
docker compose ps              # all three should show "Up"; db and backend "(healthy)"
docker compose logs -f backend # follow the backend log
docker compose down            # stop; database data is kept
docker compose down -v         # stop and DELETE all data (fresh start)
```

| Service | Container | Address on your computer | Image |
|---|---|---|---|
| `db` | `milk-delivery-db` | `localhost:5432` | `postgres:16-alpine` |
| `backend` | `milk-delivery-backend` | http://localhost:8000 (API docs at `/docs`) | `infrastructure/docker/backend.Dockerfile` |
| `frontend` | `milk-delivery-frontend` | http://localhost:5173 (nginx on 8080 inside) | `infrastructure/docker/frontend.Dockerfile` |
| `pgadmin` | `milk-delivery-pgadmin` | http://localhost:5050 (database viewer, local only, ADR-017) | `dpage/pgadmin4:9.19` |

**Viewing the data (pgAdmin).** Open http://localhost:5050 and log in with `admin@example.com` / `admin123` (local only). In the left panel: **Servers → DairyCart (local Docker) → Databases → milk_delivery → Schemas → public → Tables**. Right-click a table → **View/Edit Data → All Rows**. The connection comes from `infrastructure/docker/pgadmin-servers.json` (read on pgAdmin's first start; after changing it, run `docker compose down -v` or remove the `pgadmin-data` volume). Use pgAdmin to *look* at data; change the database structure only through Alembic migrations.

**Start order.** `db` becomes healthy → `backend` runs `alembic upgrade head`, the product seed and `create_admin` (on later starts the admin already exists; this is logged and ignored), then starts and becomes healthy → `frontend` starts.

**Logins (local only).** Website admin `admin` / `admin_local_only_123` (customers register on the website). pgAdmin `admin@example.com` / `admin123`. PostgreSQL `milk_user` / `milk_password_local_only`.

**Settings.** Local-only defaults are in `docker-compose.yml`. To override the JWT secret or admin password, create a git-ignored `.env` file in the repository root:

```bash
JWT_SECRET_KEY=<at least 32 random characters>
ADMIN_PASSWORD=<letters and numbers>
```

`ADMIN_PASSWORD` is only used when the admin is first created (an empty database).

**Frontend API address.** `VITE_API_BASE_URL` is baked into the JavaScript at build time (`http://localhost:8000/api/v1`, because the browser runs on your computer). Changing it requires `docker compose up --build`.

**Port 5432 already in use?** Another PostgreSQL (e.g. Postgres.app) is running. Stop it, or change the `db` port mapping to `"5433:5432"`.

**Backend tests against the Compose database** (from `backend/` with its `.venv`):

```bash
docker compose exec db createdb -U milk_user milk_delivery_test   # once per fresh volume
pytest
```

## 4. GCP deployment (M6 – outline)

| Step | Resource | Notes |
|---|---|---|
| 1 | GCP project + billing, budget alert | Set a low budget alert before creating anything |
| 2 | Enable APIs | Cloud Run, Cloud SQL Admin, Artifact Registry, Secret Manager, IAM Credentials |
| 3 | Artifact Registry repo `milk-delivery` | Region `asia-south1` (Mumbai) |
| 4 | Cloud SQL PostgreSQL 16 | Smallest shared-core tier; automated backups on |
| 5 | Secret Manager secret `db-password` | |
| 6 | Service accounts | `milk-backend-run` (Cloud SQL Client, Secret Accessor); `github-deployer` (Run Admin, Artifact Registry Writer, SA User) |
| 7 | Workload Identity Federation | Trust only this GitHub repository |
| 8 | Cloud Run `milk-backend` | Min instances 0, Cloud SQL connection attached |
| 9 | Cloud Run `milk-frontend` | Built with production `VITE_API_BASE_URL` |
| 10 | Cloud Logging | Verify structured logs; create a log-based alert for 5xx |

### Cost control

- Cloud Run scales to zero.
- Cloud SQL is the main cost: stop the instance when not in use during the learning period.
- Delete all resources at the end of the programme unless the POC continues.

## 5. Verification

```bash
curl https://<backend-url>/api/v1/health
# {"status":"ok","database":"ok","version":"0.1.0"}
```

Then run the manual smoke checklist (customer flow + admin status update).
