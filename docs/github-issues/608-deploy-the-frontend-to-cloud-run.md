<!-- issue-meta
title: [M6-08] Deploy the frontend to Cloud Run
labels: devops, frontend
milestone: M6 – GCP Deployment
-->
# [M6-08] Deploy the frontend to Cloud Run

**Milestone:** M6 – GCP Deployment · **Priority:** High · **Estimated effort:** 1–2 hours

## 1. Objective
Build the frontend image with the production API URL and deploy it as `milk-frontend`.

## 2. Background
Completes the hosted application.

## 3. Learning objectives
- Build-time configuration
- Public vs authenticated Cloud Run services

## 4. Prerequisites
- M6-07 done

## 5. Tasks
- [ ] Build with `VITE_API_BASE_URL=https://<backend-url>/api/v1`
- [ ] Push and deploy `milk-frontend` (min instances 0)
- [ ] Update backend `CORS_ORIGINS` with the frontend URL

## 6. Technical guidance
POC reminder: the app has no authentication. Share the URL only with the team; do not enter real customer data.

## 7. Acceptance criteria
- [ ] Full customer and admin flow works on the hosted URLs

## 8. Testing requirements
- Run the smoke checklist against Cloud Run

## 9. Expected deliverables
- Deployed frontend; URLs documented

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Why must the frontend be rebuilt if the API URL changes?
