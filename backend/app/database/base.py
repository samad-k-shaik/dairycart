"""Declarative Base: every ORM model (app/models/) inherits from it.

`Base.metadata` collects all tables; Alembic (M1-06) reads it to generate migrations.
Tables are NEVER created from application code (no `Base.metadata.create_all`).
"""

from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase

# Naming convention: every constraint and index gets a predictable name, so migrations are
# readable and stable. pk/fk match PostgreSQL's own default names; checks become
# "ck_<table>_<name>", e.g. CheckConstraint(..., name="quantity_range") on order_items
# → "ck_order_items_quantity_range".
NAMING_CONVENTION = {
    "pk": "%(table_name)s_pkey",
    "fk": "%(table_name)s_%(column_0_name)s_fkey",
    "uq": "uq_%(table_name)s_%(column_0_N_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "ix": "idx_%(table_name)s_%(column_0_N_name)s",
}


class Base(DeclarativeBase):
    """Base class for all ORM models."""

    metadata = MetaData(naming_convention=NAMING_CONVENTION)
