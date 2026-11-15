"""add delivery boys

#103: delivery boys (admin records, no login) and their areas (one delivery boy per PIN
code), plus the PIN code of the delivery address on orders and subscriptions.

Existing orders and subscriptions that have an address (#102) get their PIN code from
the end of the address text ("…, Hyderabad - 500016"); this data step was added by hand.

Revision ID: 99af8de2905d
Revises: bb669ba19a75
Create Date: 2026-11-14 19:33:58.052894

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "99af8de2905d"
down_revision: str | Sequence[str] | None = "bb669ba19a75"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "delivery_boys",
        sa.Column("delivery_boy_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("phone", sa.String(length=10), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("phone ~ '^[6-9][0-9]{9}$'", name=op.f("ck_delivery_boys_phone_format")),
        sa.PrimaryKeyConstraint("delivery_boy_id", name=op.f("delivery_boys_pkey")),
        sa.UniqueConstraint("phone", name="uq_delivery_boys_phone"),
    )
    op.create_table(
        "delivery_areas",
        sa.Column("delivery_area_id", sa.Integer(), nullable=False),
        sa.Column("pincode", sa.String(length=6), nullable=False),
        sa.Column("area_name", sa.String(length=50), nullable=True),
        sa.Column("delivery_boy_id", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "pincode ~ '^[1-9][0-9]{5}$'", name=op.f("ck_delivery_areas_pincode_format")
        ),
        sa.ForeignKeyConstraint(
            ["delivery_boy_id"],
            ["delivery_boys.delivery_boy_id"],
            name=op.f("delivery_areas_delivery_boy_id_fkey"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("delivery_area_id", name=op.f("delivery_areas_pkey")),
        sa.UniqueConstraint("pincode", name="uq_delivery_areas_pincode"),
    )
    op.create_index(
        "idx_delivery_areas_delivery_boy_id",
        "delivery_areas",
        ["delivery_boy_id"],
        unique=False,
    )
    op.add_column("orders", sa.Column("delivery_pincode", sa.String(length=6), nullable=True))
    op.add_column(
        "subscriptions",
        sa.Column("delivery_pincode", sa.String(length=6), nullable=True),
    )
    # Fill the PIN code of rows that already have an address: the address text always
    # ends with "<city> - <6-digit PIN>" (Address.full_text).
    for table in ("orders", "subscriptions"):
        op.execute(
            f"UPDATE {table} "
            "SET delivery_pincode = substring(delivery_address from '([1-9][0-9]{5})$') "
            "WHERE delivery_address IS NOT NULL"
        )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("subscriptions", "delivery_pincode")
    op.drop_column("orders", "delivery_pincode")
    op.drop_index("idx_delivery_areas_delivery_boy_id", table_name="delivery_areas")
    op.drop_table("delivery_areas")
    op.drop_table("delivery_boys")
