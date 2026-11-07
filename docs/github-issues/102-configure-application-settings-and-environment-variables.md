<!-- issue-meta
title: [M1-02] Configure application settings and environment variables
labels: backend, security
milestone: M1 – Backend Foundation
-->
# [M1-02] Configure application settings and environment variables

**Milestone:** M1 – Backend Foundation · **Priority:** High · **Estimated effort:** 2–4 hours

## 1. Objective
Load all configuration (database URL, CORS origins, log level) from environment variables using `pydantic-settings`, with a committed `.env.example`.

## 2. Background
Hard-coded configuration and committed secrets are among the most common security mistakes. The same code must run locally, in Docker and on Cloud Run with different settings.

## 3. Learning objectives
- The Twelve-Factor App "config in the environment" principle
- `pydantic-settings` `BaseSettings` and type-validated config
- Why `.env` is git-ignored but `.env.example` is committed

## 4. Prerequisites
- M1-01 merged

## 5. Tasks
- [ ] Create `app/core/config.py` with a `Settings` class (`database_url`, `cors_origins: list[str]`, `log_level`, `app_env`)
- [ ] Expose a cached `get_settings()` function (`functools.lru_cache`)
- [ ] Create `backend/.env.example` with local defaults from `docs/08-devops/deployment-guide.md`
- [ ] Fail fast with a clear error if `DATABASE_URL` is missing
- [ ] Document each variable in `backend/README.md`

## 6. Technical guidance
Use `model_config = SettingsConfigDict(env_file=".env")`. Never print the full database URL in logs, because it contains the password.

## 7. Acceptance criteria
- [ ] Settings load from environment variables and from `.env`
- [ ] Missing `DATABASE_URL` stops startup with a readable message
- [ ] `.env.example` exists; `.env` is ignored by Git
- [ ] No secrets in committed files

## 8. Testing requirements
- Unit test: `Settings` reads values from monkeypatched env vars
- Unit test: missing `DATABASE_URL` raises a validation error

## 9. Expected deliverables
- `app/core/config.py`, `backend/.env.example`, tests

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Why is `get_settings()` cached?
- Where will these values come from on Cloud Run?
