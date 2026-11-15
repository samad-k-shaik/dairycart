"""add map pins to addresses orders and subscriptions

#108 (ADR-018): an optional map pin on saved addresses, and a copy of it on orders and
subscriptions (like the address text). All columns are nullable, so existing rows stay
valid without a data step: addresses saved before #108 simply have no pin.

The CHECK constraints were added by hand (autogenerate does not detect them). Their names
follow the naming convention in app/database/base.py and match app/models/map_pin.py.

Revision ID: aa76e3a3f9c4
Revises: 99af8de2905d
Create Date: 2026-11-15 22:26:42.722879

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "aa76e3a3f9c4"
down_revision: str | Sequence[str] | None = "99af8de2905d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# (table, latitude column, longitude column)
PINS = [
    ("addresses", "latitude", "longitude"),
    ("orders", "delivery_latitude", "delivery_longitude"),
    ("subscriptions", "delivery_latitude", "delivery_longitude"),
]


def _coordinate() -> sa.Numeric:
    return sa.Numeric(precision=9, scale=6, asdecimal=False)


def upgrade() -> None:
    """Upgrade schema."""
    for table, latitude, longitude in PINS:
        op.add_column(table, sa.Column(latitude, _coordinate(), nullable=True))
        op.add_column(table, sa.Column(longitude, _coordinate(), nullable=True))
        op.create_check_constraint(
            op.f(f"ck_{table}_{latitude}_range"), table, f"{latitude} BETWEEN -90 AND 90"
        )
        op.create_check_constraint(
            op.f(f"ck_{table}_{longitude}_range"), table, f"{longitude} BETWEEN -180 AND 180"
        )
        # Both set or both NULL: half a pin is meaningless.
        op.create_check_constraint(
            op.f(f"ck_{table}_map_pin_complete"),
            table,
            f"({latitude} IS NULL) = ({longitude} IS NULL)",
        )


def downgrade() -> None:
    """Downgrade schema."""
    # Dropping a column also drops the CHECK constraints that use it.
    for table, latitude, longitude in reversed(PINS):
        op.drop_column(table, longitude)
        op.drop_column(table, latitude)
