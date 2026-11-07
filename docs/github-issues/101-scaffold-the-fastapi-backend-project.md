<!-- issue-meta
title: [M1-01] Scaffold the FastAPI backend project
labels: backend, good-first-issue
milestone: M1 – Backend Foundation
-->
# [M1-01] Scaffold the FastAPI backend project

**Milestone:** M1 – Backend Foundation · **Priority:** High · **Estimated effort:** 2–3 hours

## 1. Objective
Create a minimal, runnable FastAPI application in `backend/` with pinned dependencies and a documented way to start it.

## 2. Background
Every backend feature in M1 and M3 builds on this skeleton. It must be small, follow the folder layout in `backend/README.md`, and run the same way on every participant's machine.

## 3. Learning objectives
- What FastAPI is and how an ASGI server (Uvicorn) runs it
- Python virtual environments and why we pin dependency versions
- How `app/main.py` creates the application object
- How FastAPI generates interactive docs at `/docs`

## 4. Prerequisites
- M0 approved (architecture and API contract)
- Python 3.12 installed (`python3 --version`)
- Read `docs/04-architecture/low-level-design.md` §2

## 5. Tasks
- [ ] Create `backend/requirements.txt` with pinned versions of `fastapi`, `uvicorn[standard]`, `pydantic`, `pydantic-settings`, `sqlalchemy`, `psycopg[binary]`, `alembic`
- [ ] Create `backend/requirements-dev.txt` with `pytest`, `httpx`, `pytest-cov`, `ruff`
- [ ] Create `backend/app/__init__.py` and `backend/app/main.py` exposing `app = FastAPI(title="Milk Delivery POC API", version="0.1.0")`
- [ ] Add a temporary root route `GET /` returning `{"name": "Milk Delivery POC API"}`
- [ ] Document setup and run commands in `backend/README.md`
- [ ] Remove `.gitkeep` files only from folders that now contain real files

## 6. Technical guidance
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
```
Do not add routers, database code or business logic yet; later issues do that. Pin exact versions (`==`) so everyone installs the same thing.

## 7. Acceptance criteria
- [ ] `uvicorn app.main:app --reload` starts without errors
- [ ] `http://localhost:8000/docs` shows the Swagger UI
- [ ] `GET /` returns 200 with the JSON above
- [ ] Dependencies are pinned in two requirement files
- [ ] `backend/README.md` explains setup in under 10 steps

## 8. Testing requirements
- Start the server and call `curl http://localhost:8000/` – paste the output in the PR
- Ask another participant to follow the README on a clean machine

## 9. Expected deliverables
- `backend/app/main.py`, `requirements.txt`, `requirements-dev.txt`
- Updated `backend/README.md`

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- What does `--reload` do and why is it only for development?
- Why do we keep dev dependencies in a separate file?
