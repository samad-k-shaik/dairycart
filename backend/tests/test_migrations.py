"""Tests for the Alembic migrations (M1-06)."""

import pytest
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import Engine, inspect, text

from app.database.base import Base
from tests.conftest import alembic_config

APP_TABLES = {
    "customers",
    "products",
    "orders",
    "order_items",
    "users",
    "subscriptions",  # #97
    "subscription_items",  # #97
    "delivery_slots",  # #100
    "addresses",  # #102
    "delivery_boys",  # #103
    "delivery_areas",  # #103
}


def app_tables(engine: Engine) -> set[str]:
    return set(inspect(engine).get_table_names()) - {"alembic_version"}


def test_upgrade_downgrade_upgrade_on_the_test_database(migrated_db: Engine) -> None:
    config = alembic_config()
    assert app_tables(migrated_db) == APP_TABLES  # after upgrade head (fixture)

    command.downgrade(config, "base")
    assert app_tables(migrated_db) == set()  # everything removed cleanly

    command.upgrade(config, "head")  # and it can be applied again
    assert app_tables(migrated_db) == APP_TABLES


def test_migrations_match_the_models(migrated_db: Engine) -> None:
    """Same check as `alembic check`: autogenerate finds nothing left to migrate."""
    with migrated_db.connect() as connection:
        context = MigrationContext.configure(
            connection, opts={"compare_type": True, "compare_server_default": True}
        )
        differences = compare_metadata(context, Base.metadata)

    assert differences == []


def test_there_is_exactly_one_head() -> None:
    """Two heads would mean two migrations branched from the same parent (a merge
    conflict between PRs) and `alembic upgrade head` would refuse to run."""
    heads = ScriptDirectory.from_config(alembic_config()).get_heads()

    assert len(heads) == 1


# ---- #121: login by mobile number ----

BEFORE_MOBILE_LOGIN = "99af8de2905d"  # the revision before b2526ba63844


def test_mobile_login_migration_stops_when_old_accounts_exist(migrated_db: Engine) -> None:
    """Old accounts have no mobile number: the upgrade refuses and says how to reset the
    local database, instead of inventing numbers."""
    config = alembic_config()
    command.downgrade(config, BEFORE_MOBILE_LOGIN)
    try:
        with migrated_db.begin() as connection:
            connection.execute(
                text(
                    "INSERT INTO users (full_name, email, username, password_hash) "
                    "VALUES ('Old User', 'old@example.com', 'old', 'x')"
                )
            )

        with pytest.raises(RuntimeError, match="docker compose down -v"):
            command.upgrade(config, "head")

        columns = {c["name"] for c in inspect(migrated_db).get_columns("users")}
        assert {"email", "username"} <= columns and "phone" not in columns  # unchanged
    finally:
        with migrated_db.begin() as connection:
            connection.execute(text("DELETE FROM users"))
        command.upgrade(config, "head")


def test_mobile_login_downgrade_gives_accounts_placeholder_logins(migrated_db: Engine) -> None:
    config = alembic_config()
    with migrated_db.begin() as connection:
        user_id = connection.scalar(
            text(
                "INSERT INTO users (full_name, phone, password_hash) "
                "VALUES ('New User', '9876543210', 'x') RETURNING user_id"
            )
        )
    try:
        command.downgrade(config, BEFORE_MOBILE_LOGIN)

        with migrated_db.connect() as connection:
            row = connection.execute(text("SELECT email, username FROM users")).one()
        assert tuple(row) == (f"user{user_id}@example.invalid", f"user{user_id}")
    finally:
        with migrated_db.begin() as connection:
            connection.execute(text("DELETE FROM users"))
        command.upgrade(config, "head")
