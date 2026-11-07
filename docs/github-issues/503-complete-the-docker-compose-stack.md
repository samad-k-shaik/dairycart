<!-- issue-meta
title: [M5-03] Complete the Docker Compose stack
labels: devops
milestone: M5 – Docker and CI
-->
# [M5-03] Complete the Docker Compose stack

**Milestone:** M5 – Docker and CI · **Priority:** High · **Estimated effort:** 2–4 hours

## 1. Objective
Run database, backend (with migrations and seed) and frontend together with `docker compose up --build`.

## 2. Background
One command to run everything is the M5 portability goal (NFR-14).

## 3. Learning objectives
- Compose services, networks, healthchecks and `depends_on`
- Service names as hostnames

## 4. Prerequisites
- M5-01 and M5-02 merged

## 5. Tasks
- [ ] Add `backend` and `frontend` services to `docker-compose.yml`
- [ ] Backend waits for `db` health, runs `alembic upgrade head` and the seed, then starts
- [ ] Use `db` as the database host
- [ ] Update the deployment guide

## 6. Technical guidance
Keep local-only credentials clearly marked; never reuse them anywhere else.

## 7. Acceptance criteria
- [ ] Fresh clone → `docker compose up --build` → working app at `localhost:5173` (or chosen port)
- [ ] `docker compose down -v` resets everything

## 8. Testing requirements
- Run the smoke checklist (M4-09) against Compose

## 9. Expected deliverables
- Updated `docker-compose.yml`, docs

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- How does the backend container find the database?
