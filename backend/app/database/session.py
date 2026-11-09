"""Engine, session factory and the `get_db()` FastAPI dependency (M1-04, LLD §5).

- ENGINE: one per process. It owns a connection POOL: a few open connections that are
  reused, because opening a new PostgreSQL connection for every request is slow.
- SESSION: one per request (a unit of work: queries, then commit or rollback).
- get_db(): gives each request its own session and ALWAYS closes it, even on errors, so the
  connection goes back to the pool and no half-finished transaction is left open.

No tables are created here: the schema is managed only by Alembic migrations (M1-06).
"""

from collections.abc import Iterator

from sqlalchemy import URL, create_engine, make_url
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings


def database_url() -> URL:
    """DATABASE_URL from settings, always using the psycopg 3 driver (ADR-007).

    `postgresql://...` would make SQLAlchemy look for psycopg2, which we do not install,
    so it is switched to `postgresql+psycopg://...`.
    """
    url = make_url(get_settings().database_url.get_secret_value())
    if url.drivername == "postgresql":
        url = url.set(drivername="postgresql+psycopg")
    return url


engine = create_engine(
    database_url(),
    # Check a pooled connection is alive before using it. Databases (and Cloud SQL) drop
    # idle connections; without this the first request after a pause could fail.
    pool_pre_ping=True,
    # Never put query VALUES (e.g. phone numbers) into error messages or SQL logs.
    hide_parameters=True,
)

# Factory for sessions. autoflush=False: changes are sent to the database when we flush or
# commit explicitly, which keeps service code (M3) predictable.
SessionLocal = sessionmaker(bind=engine, autoflush=False)


def get_db() -> Iterator[Session]:
    """FastAPI dependency: one session per request, always closed afterwards.

    Usage in a router (M1-09 onward), the form FastAPI recommends:
        def endpoint(db: Annotated[Session, Depends(get_db)]): ...

    FastAPI runs the code before `yield` before the endpoint, and the `finally` block after
    the response, including when the endpoint raises an exception.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()  # returns the connection to the pool; rolls back anything uncommitted
