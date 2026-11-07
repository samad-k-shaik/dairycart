<!-- issue-meta
title: [M5-05] Create the backend CI workflow in GitHub Actions
labels: devops, backend, testing
milestone: M5 – Docker and CI
-->
# [M5-05] Create the backend CI workflow in GitHub Actions

**Milestone:** M5 – Docker and CI · **Priority:** High · **Estimated effort:** 2–4 hours

## 1. Objective
Run lint, migrations and tests for the backend on every pull request using a PostgreSQL service container.

## 2. Background
CI gives every PR the same automatic checks, so reviewers focus on design and logic.

## 3. Learning objectives
- GitHub Actions workflows, jobs, steps and service containers
- Dependency caching

## 4. Prerequisites
- M4 complete

## 5. Tasks
- [ ] Create `.github/workflows/ci.yml` with a `backend` job
- [ ] Steps: checkout → setup-python 3.12 (pip cache) → install → `ruff check` → `alembic upgrade head` → `pytest --cov`
- [ ] PostgreSQL 16 service container with health check

## 6. Technical guidance
Pin action major versions (`actions/checkout@v4`). Keep the job under 5 minutes.

## 7. Acceptance criteria
- [ ] Job passes on a PR and fails when a test is broken

## 8. Testing requirements
- Link to a green run and a deliberately red run

## 9. Expected deliverables
- `ci.yml` backend job

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- What is a service container?
