<!-- issue-meta
title: [M1-04] Configure SQLAlchemy engine, session and database dependency
labels: backend, database
milestone: M1 – Backend Foundation
-->
# [M1-04] Configure SQLAlchemy engine, session and database dependency

**Milestone:** M1 – Backend Foundation · **Priority:** High · **Estimated effort:** 2–4 hours

## 1. Objective
Connect the backend to PostgreSQL with a SQLAlchemy 2.0 engine, a session factory and a `get_db()` FastAPI dependency that gives each request its own session.

## 2. Background
All repositories receive a session from this dependency (see LLD §5). Getting session lifecycle right prevents connection leaks and half-finished transactions.

## 3. Learning objectives
- SQLAlchemy engine vs session vs connection pool
- FastAPI dependency injection with `yield`
- Why one session per request
- Running PostgreSQL in Docker

## 4. Prerequisites
- M1-02 merged
- Docker installed; `docker compose up -d db` works

## 5. Tasks
- [ ] Create `app/database/base.py` with `class Base(DeclarativeBase)`
- [ ] Create `app/database/session.py` with `engine` (`pool_pre_ping=True`), `SessionLocal` and `get_db()`
- [ ] Use `postgresql+psycopg://` URLs from settings
- [ ] Document how to start the local database

## 6. Technical guidance
```python
def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```
Do not create tables here; Alembic does that (M1-06).

## 7. Acceptance criteria
- [ ] Backend connects to the Compose PostgreSQL using `DATABASE_URL`
- [ ] `get_db()` always closes the session, even on exceptions
- [ ] No table creation via `Base.metadata.create_all` in application code

## 8. Testing requirements
- Test: `get_db()` yields a session that can run `SELECT 1`
- Test: session is closed after the generator finishes

## 9. Expected deliverables
- `app/database/base.py`, `app/database/session.py`, tests

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- What is a connection pool and why does it matter on Cloud Run?
- What happens if we forget `db.close()`?
