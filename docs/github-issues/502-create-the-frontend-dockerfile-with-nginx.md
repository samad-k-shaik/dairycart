<!-- issue-meta
title: [M5-02] Create the frontend Dockerfile with nginx
labels: devops, frontend
milestone: M5 – Docker and CI
-->
# [M5-02] Create the frontend Dockerfile with nginx

**Milestone:** M5 – Docker and CI · **Priority:** High · **Estimated effort:** 2–4 hours

## 1. Objective
Build the frontend with Node and serve the static files with nginx in a small final image (ADR-008).

## 2. Background
Cloud Run needs an HTTP server for the built files.

## 3. Learning objectives
- Multi-stage builds (build stage vs runtime stage)
- Build-time variables (`VITE_API_BASE_URL`)
- SPA fallback routing in nginx

## 4. Prerequisites
- M5-01 merged

## 5. Tasks
- [ ] Create `infrastructure/docker/frontend.Dockerfile` (node:20 build → nginx:alpine)
- [ ] Create `infrastructure/docker/nginx.conf` with `try_files $uri /index.html` and listen on `${PORT}`
- [ ] Pass `VITE_API_BASE_URL` as a build argument
- [ ] Mark ADR-008 Accepted

## 6. Technical guidance
Vite variables are baked in at build time; a different API URL needs a new build.

## 7. Acceptance criteria
- [ ] Image serves the app; deep links like `/admin/orders` work on refresh

## 8. Testing requirements
- Run the container and refresh a deep link; screenshot

## 9. Expected deliverables
- Dockerfile, nginx config

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Why does a refresh on `/admin/orders` need `try_files`?
