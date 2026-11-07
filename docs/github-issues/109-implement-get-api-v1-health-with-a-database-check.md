<!-- issue-meta
title: [M1-09] Implement GET /api/v1/health with a database check
labels: backend, good-first-issue
milestone: M1 – Backend Foundation
-->
# [M1-09] Implement GET /api/v1/health with a database check

**Milestone:** M1 – Backend Foundation · **Priority:** High · **Estimated effort:** 1–2 hours

## 1. Objective
Add a health endpoint that reports API status and database connectivity, used later by Docker, Cloud Run and smoke tests.

## 2. Background
Health checks tell infrastructure whether the app is ready. Ours also checks the database so a broken connection is visible immediately.

## 3. Learning objectives
- APIRouter and route prefixes
- Liveness vs readiness checks
- Returning different status codes from one endpoint

## 4. Prerequisites
- M1-04 and M1-08 merged

## 5. Tasks
- [ ] Create `app/routers/health.py` with `GET /health` under prefix `/api/v1`
- [ ] Run `SELECT 1`; return 200 `{"status": "ok", "database": "ok", "version": "0.1.0"}`
- [ ] On DB failure return 503 with `"status": "degraded"`, `"database": "unavailable"`
- [ ] Remove the temporary `GET /` route from M1-01

## 6. Technical guidance
Match the contract in `api-contracts.md` exactly. Keep the check fast (no heavy queries).

## 7. Acceptance criteria
- [ ] Response bodies and codes match the API contract
- [ ] Endpoint appears in `/docs`

## 8. Testing requirements
- API test: 200 with DB up
- API test: 503 when the DB session raises (override `get_db`)

## 9. Expected deliverables
- `app/routers/health.py`, tests

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- How will Cloud Run use this endpoint?
