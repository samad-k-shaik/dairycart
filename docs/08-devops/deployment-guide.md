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

| Variable | Example | Service |
|---|---|---|
| `DATABASE_URL` | `postgresql+psycopg://milk_user:milk_password_local_only@localhost:5432/milk_delivery` | backend |
| `CORS_ORIGINS` | `http://localhost:5173` | backend |
| `LOG_LEVEL` | `INFO` | backend |
| `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` | frontend |

## 3. Full stack with Docker Compose (M5)

```bash
docker compose up --build
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
