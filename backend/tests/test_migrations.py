"""Tests for the Alembic migrations (M1-06)."""

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import Engine, inspect

from app.database.base import Base
from tests.conftest import alembic_config

APP_TABLES = {"customers", "products", "orders", "order_items", "users"}


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
