<!-- issue-meta
title: [M6-07] Deploy the backend to Cloud Run and run migrations
labels: devops, backend
milestone: M6 – GCP Deployment
-->
# [M6-07] Deploy the backend to Cloud Run and run migrations

**Milestone:** M6 – GCP Deployment · **Priority:** High · **Estimated effort:** 2–3 hours

## 1. Objective
Deploy the backend image to Cloud Run connected to Cloud SQL, run Alembic migrations and the seed as a Cloud Run Job, and verify health.

## 2. Background
First production deployment of the API.

## 3. Learning objectives
- Cloud Run services and jobs
- Cloud SQL connections from Cloud Run
- Scale to zero

## 4. Prerequisites
- M6-02 to M6-05 done

## 5. Tasks
- [ ] Deploy service `milk-backend` (min instances 0, max 2, runtime SA `milk-backend-run`, Cloud SQL attached, secret as env var)
- [ ] Create Cloud Run Job `milk-migrate` running `alembic upgrade head` and the seed
- [ ] Set `CORS_ORIGINS` once the frontend URL is known
- [ ] Verify `/api/v1/health`

## 6. Technical guidance
Do this manually first so everyone understands each flag; M6-09 automates it.

## 7. Acceptance criteria
- [ ] `/api/v1/health` returns 200 with `database: ok`
- [ ] Products endpoint returns the 4 products

## 8. Testing requirements
- curl output in the issue

## 9. Expected deliverables
- Deployed service; commands documented

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Why run migrations as a separate job?
