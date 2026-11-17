# Milestones

Descriptions below are also used as the GitHub milestone descriptions. Implementation issues for every milestone are in this folder (`1xx` = M1 … `8xx` = M8, `11xx` = M11, `12xx` = M12; there is no M9 or M10) and on GitHub. The candidate lists below are the original summaries.

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

## M8 – Ordering, Subscriptions and Delivery Operations
Built after M3 on top of the order flow: admin product management, the customer pages look (dairy-farm background, own product illustrations, Fraunces headings), ordering options (one-time order or a 7/15/30-day subscription, delivered every 1, 2 or 3 days) with automatic daily orders, delivery time slots, saved delivery addresses, delivery boys with PIN code areas, one admin Orders board, per-user order history and the admin Income tab. Issues: `8xx`.

## M11 – User Authentication and Admin Management
Accounts and roles: sign-up, login and an admin area; login required to order, with "My orders" per account; a separate login per browser tab; admin-only product stock reduced by orders; then login by mobile number and password instead of email or username (ADR-019). Issues: `11xx`.

## M12 – Future: Maps and Live Delivery Tracking
Future enhancement, needs the scope change in M12-01 first. Free and open source only: Leaflet + OpenStreetMap maps, a map pin on saved addresses, delivery boy login, live location from the phone browser (Geolocation API), admin live map and customer order tracking with a straight-line ETA (polling), then push updates with SSE and PostgreSQL LISTEN/NOTIFY. Ends with a "Navigate" button that opens Google Maps directions as a plain link (ADR-021). No embedded Google Maps, Redis, Kafka or native apps. Issues: `12xx`.
