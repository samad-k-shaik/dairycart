"""Shared pytest setup.

The app reads its settings when it is imported (fail fast, M1-02), so the tests need a
DATABASE_URL before any test module imports `app.main`. pytest loads this file first.
setdefault: a value already set in the shell (e.g. by CI) wins.
No database is contacted yet; the real test database setup comes in M1-11.
"""

import os

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://test_user:test_password@localhost:5432/milk_delivery_test",
)
os.environ.setdefault("APP_ENV", "test")
