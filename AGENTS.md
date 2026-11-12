# AGENTS.md – Instructions for AI Coding Assistants

This file is read by Codex and other AI coding assistants working in this repository. Humans should read it too: it describes how AI-assisted work is expected to happen here.

This is a **learning-first** project. The goal is that every participant understands the code that ends up in the repository, not just that code exists.

## The mandatory workflow

For every task, follow these steps in order.

1. **Read the GitHub Issue first.** Identify its objective, acceptance criteria, testing requirements and Definition of Done. If no issue is referenced, ask for one. Do not start work without an issue.
2. **Understand the existing architecture.** Read the relevant documents before touching code:
   - `docs/04-architecture/high-level-design.md`
   - `docs/04-architecture/low-level-design.md`
   - `docs/04-architecture/database-erd.md`
   - `docs/05-api/api-contracts.md`
   - `docs/06-ui-ux/design-system.md` (frontend work)
3. **Analyze relevant source files.** Look at the existing code in the area you will change. Reuse existing patterns, helpers and types instead of creating new ones.
4. **Explain the implementation plan before coding.** Write a short plan: files to create or change, approach, tests to add, and open questions. Wait for the participant to confirm the plan.
5. **Avoid unrelated changes.** Change only what the issue requires. No drive-by refactors, reformatting of untouched files, or dependency upgrades. Suggest them as a separate issue instead.
6. **Follow established project conventions** (see below).
7. **Write appropriate tests** for new behaviour: backend with `pytest`, frontend with the test tooling chosen in M4.
8. **Validate your changes.** Run the tests, linters and type checks that exist for the area you changed, and report the actual commands and output.
9. **Update documentation** when behaviour, APIs, data models or setup steps change.
10. **Report implementation limitations honestly.** List anything incomplete, assumed, untested or risky.

## Honesty rules

- **Never claim tests passed unless you actually ran them** in this session and saw them pass. If you could not run them, say so and say why.
- Never invent command output, issue numbers, URLs or API behaviour.
- If you are unsure, say you are unsure.
- If the issue is ambiguous, ask instead of guessing.

## Learning rules

- Explain *why* the code is written the way it is, not only *what* it does.
- Prefer simple, readable code over clever code.
- When introducing a concept a beginner may not know (dependency injection, transactions, query caching…), add a short explanation in the PR description.
- The participant must be able to explain every line during code review. If they cannot, the PR is not ready.

## Project conventions

### Architecture
- Modular monolith. **No microservices.**
- Do not add frameworks, libraries or cloud services outside the approved stack without an Architecture Decision Record (ADR) in `docs/04-architecture/high-level-design.md`.
- Backend layering: `routers → services → repositories → models`. Routers never query the database directly.
- Business rules (price lookup, total calculation, status transitions) live in `services/`.
- **The backend calculates order totals from database prices.** Never trust totals or prices sent by the frontend.

### Backend (Python / FastAPI)
- Python 3.12, type hints everywhere.
- Pydantic schemas in `app/schemas/`, SQLAlchemy models in `app/models/`.
- All routes under `/api/v1`.
- Database schema changes only through Alembic migrations.
- Money uses `Decimal` / `NUMERIC(10,2)`, never `float`.
- Error responses follow the format in `docs/05-api/api-contracts.md`.

### Frontend (React / TypeScript)
- Functional components and hooks, TypeScript strict mode.
- Tailwind CSS + shadcn/ui components; icons from Lucide React.
- Server state via TanStack Query; API calls only in `src/services/`.
- Shared types in `src/types/`.
- Follow the tokens in `docs/06-ui-ux/design-system.md` (Manrope, blue primary, rounded cards).
- The frontend uses the **real backend** (M3): every HTTP call goes through `src/services/apiClient.ts`, which reads `VITE_API_BASE_URL` (see `frontend/.env.example`). Pages never call `fetch` directly.
- The M2 mock services in `src/services/mock/` are kept only for offline UI work behind `VITE_USE_MOCKS=true`. New features must work against the real backend; do not build a feature on the mock alone.
- Backend and frontend change together: a new or changed endpoint needs the API contract, backend tests, and the matching frontend service function.

### Git
- Branch from `develop`: `feature/<issue-number>-short-name`, `bugfix/<issue-number>-short-name`.
- Commit messages: `type(scope): summary (#issue)`, e.g. `feat(backend): add product list endpoint (#12)`.
- Never push to `main` or `develop` directly.
- Every PR uses the PR template and references its issue (`Closes #N`).

## Out of scope (do not implement)

OTP authentication, payment gateway, automatic scheduling or prepaid subscriptions (basic daily subscriptions are in scope since #97), multi-vendor, delivery partner app, Google Maps, WhatsApp notifications, AI chatbot, agentic AI, demand forecasting, advanced analytics. If an issue seems to need one of these, stop and ask.

## Do not

- Commit secrets, `.env` files, credentials or service-account keys.
- Delete files, branches or data without explicit confirmation.
- Deploy to GCP or create cloud resources unless the issue explicitly asks for it.
- Disable tests or linters to make CI pass.
