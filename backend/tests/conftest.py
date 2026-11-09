"""Shared pytest setup.

The app reads its settings when it is imported (fail fast, M1-02), so the tests need a
DATABASE_URL before any test module imports `app.main`. pytest loads this file first.
setdefault: a value already set in the shell (e.g. by CI) wins.

Tests use a SEPARATE database, milk_delivery_test, never the development database.
The local password below is the public Docker Compose one (local development only).
The full test-database setup comes in M1-11; for now:
- db_engine:   skips the test if PostgreSQL is not running
- migrated_db: the test database migrated with Alembic (upgrade head), once per run
- db_session:  a session inside a transaction that is rolled back after each test
"""

import os
from collections.abc import Iterator
from pathlib import Path

import pytest

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://milk_user:milk_password_local_only@localhost:5432/milk_delivery_test",
)
os.environ.setdefault("APP_ENV", "test")

# Imported after the environment is prepared (they read the settings on import).
from alembic import command
from alembic.config import Config
from sqlalchemy import Engine, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.database.session import engine as app_engine

BACKEND_DIR = Path(__file__).resolve().parents[1]


def alembic_config() -> Config:
    """Alembic settings for tests (works from any working directory)."""
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    config.attributes["configure_logger"] = False  # keep pytest's log capture
    return config


@pytest.fixture(scope="session")
def db_engine() -> Iterator[Engine]:
    """The app's engine, pointed at the test database. Skips the test if PostgreSQL is
    not running, with a message saying how to start it."""
    try:
        with app_engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except OperationalError:
        pytest.skip(
            "PostgreSQL test database not reachable (milk_delivery_test on localhost:5432). "
            "Start the local database: see backend/README.md → Local database."
        )
    yield app_engine


@pytest.fixture(scope="session")
def migrated_db(db_engine: Engine) -> Iterator[Engine]:
    """Test database at the latest migration for the whole test run; emptied afterwards."""
    config = alembic_config()
    command.upgrade(config, "head")
    yield db_engine
    command.downgrade(config, "base")


@pytest.fixture
def db_session(migrated_db: Engine) -> Iterator[Session]:
    """A session whose changes are rolled back after the test, so tests never leave data.

    Code under test may call commit(): with join_transaction_mode="create_savepoint" that
    only releases a savepoint inside the outer transaction, which is rolled back here.
    """
    with migrated_db.connect() as connection, connection.begin() as transaction:
        session = Session(bind=connection, join_transaction_mode="create_savepoint")
        yield session
        session.close()
        transaction.rollback()
