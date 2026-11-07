<!-- issue-meta
title: [M1-11] Set up pytest with a test database and CI-ready fixtures
labels: backend, testing
milestone: M1 – Backend Foundation
-->
# [M1-11] Set up pytest with a test database and CI-ready fixtures

**Milestone:** M1 – Backend Foundation · **Priority:** High · **Estimated effort:** 2–4 hours

## 1. Objective
Create a reliable pytest setup where each test runs against a real PostgreSQL test database inside a transaction that is rolled back.

## 2. Background
Fast, isolated tests are the foundation of M4 and CI in M5. Testing against real PostgreSQL catches constraint and type issues that SQLite would hide.

## 3. Learning objectives
- pytest fixtures and `conftest.py`
- FastAPI `TestClient` and `app.dependency_overrides`
- Transactional test isolation

## 4. Prerequisites
- M1-06 merged

## 5. Tasks
- [ ] Create `backend/tests/conftest.py` with fixtures `db_session` (rolled back after each test) and `client` (overrides `get_db`)
- [ ] Use `TEST_DATABASE_URL` (e.g. `milk_delivery_test` database) and run migrations once per session
- [ ] Add small factory helpers for products and customers
- [ ] Move tests written in earlier M1 issues to use these fixtures
- [ ] Document `pytest` usage in `backend/README.md`

## 6. Technical guidance
Use the "join session into external transaction" pattern from the SQLAlchemy docs so commits inside services are still rolled back.

## 7. Acceptance criteria
- [ ] `pytest` runs all backend tests green from a clean database
- [ ] Tests do not depend on run order
- [ ] No test touches the development database

## 8. Testing requirements
- Run `pytest -q` twice in a row; both green; paste output
- Run one test file on its own (`pytest tests/api/test_products.py`) and confirm it passes independently

## 9. Expected deliverables
- `tests/conftest.py`, factories, README section

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Why roll back after each test instead of deleting rows?
