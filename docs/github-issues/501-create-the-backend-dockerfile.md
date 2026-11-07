<!-- issue-meta
title: [M5-01] Create the backend Dockerfile
labels: devops, backend
milestone: M5 – Docker and CI
-->
# [M5-01] Create the backend Dockerfile

**Milestone:** M5 – Docker and CI · **Priority:** High · **Estimated effort:** 2–4 hours

## 1. Objective
Build a small, secure production image for the FastAPI backend.

## 2. Background
The same image runs in Compose (M5) and Cloud Run (M6).

## 3. Learning objectives
- Images, layers and caching
- Multi-stage builds
- Running as a non-root user
- `.dockerignore`

## 4. Prerequisites
- M4 complete

## 5. Tasks
- [ ] Create `infrastructure/docker/backend.Dockerfile` (python:3.12-slim, multi-stage)
- [ ] Install only runtime dependencies; run as non-root
- [ ] Start with `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}`
- [ ] Add `backend/.dockerignore`

## 6. Technical guidance
Cloud Run sets `PORT`; respect it. Copy `requirements.txt` before source code to use layer caching.

## 7. Acceptance criteria
- [ ] Image builds and `/api/v1/health` responds when run with a database
- [ ] Image runs as non-root
- [ ] Image size noted in the PR

## 8. Testing requirements
- `docker build` and `docker run` output in the PR

## 9. Expected deliverables
- Dockerfile, `.dockerignore`

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Why run as non-root?
