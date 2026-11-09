"""Shared pytest setup.

The app reads its settings when it is imported (fail fast, M1-02), so the tests need a
DATABASE_URL before any test module imports `app.main`. pytest loads this file first.
setdefault: a value already set in the shell (e.g. by CI) wins.

Tests use a SEPARATE database, milk_delivery_test, never the development database.
The local password below is the public Docker Compose one (local development only).
The full test-database setup (fixtures, migrations, isolation) comes in M1-11.
"""

import os
from collections.abc import Iterator

import pytest

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://milk_user:milk_password_local_only@localhost:5432/milk_delivery_test",
)
os.environ.setdefault("APP_ENV", "test")

# Imported after the environment is prepared (they read the settings on import).
from sqlalchemy import Engine, text
from sqlalchemy.exc import OperationalError

from app.database.session import engine as app_engine


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
