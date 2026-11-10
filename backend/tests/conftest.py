"""Shared pytest setup (M1-11).

Every test that needs a database runs against a REAL PostgreSQL test database, inside a
transaction that is rolled back afterwards, so tests never see each other's data and
never depend on run order.

Database: TEST_DATABASE_URL (default: milk_delivery_test on localhost). It is FORCED into
DATABASE_URL before the app is imported, so a DATABASE_URL in your shell or backend/.env
(the development database) is never used by tests. The name must end in "_test".

Fixtures:
- db_engine:   the app engine on the test database; skips the test if PostgreSQL is down
- migrated_db: Alembic `upgrade head` once per test run, `downgrade base` at the end
- db_session:  a session joined to an outer transaction that is always rolled back
- client:      FastAPI TestClient whose endpoints get that same db_session
Factories for products, customers and orders: tests/factories.py.
"""

import os
from collections.abc import Iterator
from pathlib import Path

import pytest
from sqlalchemy import make_url

DEFAULT_TEST_DATABASE_URL = "postgresql+psycopg://milk_user:milk_password_local_only@localhost:5432/milk_delivery_test"
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", DEFAULT_TEST_DATABASE_URL)

# Safety guard: refuse to run the test suite against anything but a *_test database.
_test_db_name = make_url(TEST_DATABASE_URL).database or ""
if not _test_db_name.endswith("_test"):
    raise pytest.UsageError(
        f"TEST_DATABASE_URL must point to a database whose name ends in '_test' "
        f"(got '{_test_db_name}'). Tests must never run against the development database."
    )

# Force (not setdefault): the app reads DATABASE_URL on import (fail fast, M1-02).
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ["APP_ENV"] = "test"
# A fixed secret for tests only (#89), so tokens can be created and checked.
os.environ.setdefault("JWT_SECRET_KEY", "test-only-secret-key-that-is-long-enough-123")

# Imported after the environment is prepared (they read the settings on import).
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.core import security
from app.database.session import engine as app_engine
from app.database.session import get_db
from app.models import User, UserRole
from tests import factories

# bcrypt is slow on purpose (cost 12 ≈ 0.2 s per hash). Tests create many users, so they
# use the minimum cost (4). The algorithm is the same; real code keeps BCRYPT_ROUNDS = 12.
security.BCRYPT_ROUNDS = 4

BACKEND_DIR = Path(__file__).resolve().parents[1]


def alembic_config() -> Config:
    """Alembic settings for tests (works from any working directory)."""
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    config.attributes["configure_logger"] = False  # keep pytest's log capture
    return config


@pytest.fixture(scope="session")
def db_engine() -> Iterator[Engine]:
    """The app's engine on the test database. Skips the test if PostgreSQL is not
    running, with a message saying how to start it."""
    try:
        with app_engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except OperationalError:
        pytest.skip(
            f"PostgreSQL test database '{_test_db_name}' not reachable. "
            "Start the local database: see backend/README.md → Local database."
        )
    yield app_engine


@pytest.fixture(scope="session")
def migrated_db(db_engine: Engine) -> Iterator[Engine]:
    """Test database at the latest migration, once per test run; emptied afterwards."""
    config = alembic_config()
    command.upgrade(config, "head")
    yield db_engine
    command.downgrade(config, "base")


@pytest.fixture
def db_session(migrated_db: Engine) -> Iterator[Session]:
    """A session whose changes are ALWAYS rolled back after the test.

    "Join the session into an external transaction" (SQLAlchemy docs): the test owns the
    outer transaction; with join_transaction_mode="create_savepoint", a commit() inside
    a service only releases a savepoint, and the outer rollback still undoes everything.
    Rolling back is faster and safer than deleting rows, and also resets data created
    by triggers or cascades.
    """
    with migrated_db.connect() as connection, connection.begin() as transaction:
        session = Session(bind=connection, join_transaction_mode="create_savepoint")
        yield session
        session.close()
        transaction.rollback()


@pytest.fixture
def client(db_session: Session) -> Iterator[TestClient]:
    """HTTP test client for the real app; every request uses the test's db_session."""
    from app.main import app

    app.dependency_overrides[get_db] = lambda: db_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# ---- Logged-in users (#89) ----


@pytest.fixture
def admin_user(db_session: Session) -> User:
    return factories.make_user(db_session, role=UserRole.ADMIN)


@pytest.fixture
def normal_user(db_session: Session) -> User:
    return factories.make_user(db_session, role=UserRole.USER)


@pytest.fixture
def admin_client(client: TestClient, admin_user: User) -> TestClient:
    """The same test client, but every request is sent as a logged-in ADMIN."""
    client.headers.update(factories.auth_header(admin_user))
    return client
