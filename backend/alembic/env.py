"""Alembic environment: how migrations connect to the database (M1-06).

- The database URL comes from the app settings (DATABASE_URL in the environment or
  backend/.env), never from alembic.ini, so no password is committed.
- `target_metadata` is our models' metadata, so `alembic revision --autogenerate` can
  compare the models with the database and draft a migration.

Run from backend/:  alembic upgrade head   |   alembic downgrade base
"""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import Connection, create_engine, pool

from app.database.base import Base
from app.database.session import database_url

# Import every model so Base.metadata contains all tables (see app/models/__init__.py).
import app.models  # noqa: F401  # isort: skip

config = context.config

# Alembic's own console logging (configured in alembic.ini). Tests turn it off
# (config.attributes["configure_logger"] = False) so it does not replace pytest's logging.
if config.config_file_name is not None and config.attributes.get(
    "configure_logger", True
):
    fileConfig(config.config_file_name, disable_existing_loggers=False)

target_metadata = Base.metadata

# Compare options for autogenerate: also detect column TYPE and DEFAULT changes,
# which Alembic ignores unless asked.
COMPARE_OPTIONS = {"compare_type": True, "compare_server_default": True}


def run_migrations_offline() -> None:
    """'Offline' mode: write the SQL to the screen instead of running it
    (`alembic upgrade head --sql`), e.g. to review it or hand it to a DBA."""
    context.configure(
        url=database_url().render_as_string(hide_password=False),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        **COMPARE_OPTIONS,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """'Online' mode: connect and run the migrations.

    If the caller (e.g. a test) passes an open connection in config.attributes, use it;
    otherwise create a short-lived engine (NullPool: no pooled connections left behind).
    """
    connection = config.attributes.get("connection")
    if connection is not None:
        _run(connection)
        return

    engine = create_engine(database_url(), poolclass=pool.NullPool)
    with engine.connect() as connection:
        _run(connection)


def _run(connection: Connection) -> None:
    context.configure(
        connection=connection, target_metadata=target_metadata, **COMPARE_OPTIONS
    )
    with context.begin_transaction():
        context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
