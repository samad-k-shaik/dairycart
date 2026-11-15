"""delivery rounds and locations

#110 (ADR-018): live location during a delivery round.
- delivery_boys.round_started_at: NULL = not on a round (his location is refused).
- delivery_locations: his LATEST position only, one row per delivery boy (upsert),
  deleted when the round stops. No history (privacy, NFR-17).

Revision ID: b01d7b7a246d
Revises: 55754c848525
Create Date: 2026-11-15 23:02:31.615404

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b01d7b7a246d"
down_revision: str | Sequence[str] | None = "55754c848525"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "delivery_locations",
        sa.Column("delivery_boy_id", sa.Integer(), nullable=False),
        sa.Column("latitude", sa.Numeric(precision=9, scale=6, asdecimal=False), nullable=False),
        sa.Column("longitude", sa.Numeric(precision=9, scale=6, asdecimal=False), nullable=False),
        sa.Column("accuracy_m", sa.Integer(), nullable=True),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "accuracy_m >= 0", name=op.f("ck_delivery_locations_accuracy_non_negative")
        ),
        sa.CheckConstraint(
            "latitude BETWEEN -90 AND 90", name=op.f("ck_delivery_locations_latitude_range")
        ),
        sa.CheckConstraint(
            "longitude BETWEEN -180 AND 180", name=op.f("ck_delivery_locations_longitude_range")
        ),
        sa.ForeignKeyConstraint(
            ["delivery_boy_id"],
            ["delivery_boys.delivery_boy_id"],
            name=op.f("delivery_locations_delivery_boy_id_fkey"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("delivery_boy_id", name=op.f("delivery_locations_pkey")),
    )
    op.add_column(
        "delivery_boys", sa.Column("round_started_at", sa.DateTime(timezone=True), nullable=True)
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("delivery_boys", "round_started_at")
    op.drop_table("delivery_locations")
