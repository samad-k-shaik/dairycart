# Milestones

Descriptions below are also used as the GitHub milestone descriptions. Implementation issues for every milestone are in this folder (`1xx` = M1 … `7xx` = M7) and on GitHub. The candidate lists below are the original summaries.

## M0 – Project Foundation
Repository, documentation, architecture, API contract, ERD, GitHub board, labels, Git and AI-assistant standards. No application code.

## M1 – Backend Foundation
FastAPI project scaffold, settings and logging, database session, SQLAlchemy models, first Alembic migration, seed data, `GET /health`, `GET /products`, `GET /products/{id}`, first pytest tests.
*Candidate issues:* scaffold FastAPI app · configure settings · database session · models · initial migration · seed script · health endpoint · product endpoints · error handling.

## M2 – Frontend Foundation
Vite + React + TypeScript scaffold, Tailwind + shadcn/ui, Manrope and design tokens, layouts and routing, all 7 screens using **mock JSON**, cart state. Ends with design approval.
*Candidate issues:* scaffold Vite app · design tokens · layouts & routing · ProductCard + home · product details · cart · checkout & confirmation · order history · admin dashboard · admin orders · design review.

## M3 – Order Management
`POST /orders` with server-side totals and transactions, `GET /orders/{id}`, order history, admin order list and status updates, CORS, switching frontend services from mock to real APIs.

## M4 – Testing and Quality
Backend unit/API/DB tests, frontend Vitest + RTL tests, Ruff/ESLint/Prettier, coverage gate, manual smoke checklist, accessibility check.

## M5 – Docker and CI
Backend and frontend Dockerfiles, full Docker Compose stack, GitHub Actions CI, required status checks on `main`/`develop`.

## M6 – GCP Deployment
Artifact Registry, Cloud SQL, Secret Manager, Cloud Run (backend + frontend), Workload Identity Federation, deploy workflow with production approval, Cloud Logging and basic alerting.

## M7 – Final Demonstration
End-to-end demo, documentation review, retrospective, individual learning reflections, backlog of future features.
