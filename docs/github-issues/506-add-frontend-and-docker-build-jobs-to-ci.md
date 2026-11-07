<!-- issue-meta
title: [M5-06] Add frontend and Docker build jobs to CI
labels: devops, frontend, testing
milestone: M5 – Docker and CI
-->
# [M5-06] Add frontend and Docker build jobs to CI

**Milestone:** M5 – Docker and CI · **Priority:** High · **Estimated effort:** 2–4 hours

## 1. Objective
Add a frontend job (lint, typecheck, test, build) and a job that builds both Docker images without pushing.

## 2. Background
Catches frontend and container problems before merge.

## 3. Learning objectives
- Parallel jobs
- `npm ci` vs `npm install`

## 4. Prerequisites
- M5-05 merged

## 5. Tasks
- [ ] `frontend` job: setup-node 20 (npm cache) → `npm ci` → lint → typecheck → `npm test -- --run` → build
- [ ] `docker-build` job: build backend and frontend images
- [ ] Delete the M0 `ci-placeholder.yml` workflow
- [ ] Update `docs/08-devops/ci-cd-strategy.md`

## 6. Technical guidance
Use `docker/build-push-action` with `push: false`, or plain `docker build`.

## 7. Acceptance criteria
- [ ] All three jobs run in parallel and pass

## 8. Testing requirements
- Link to a green run

## 9. Expected deliverables
- Updated `ci.yml`, docs

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Why does CI use `npm ci`?
