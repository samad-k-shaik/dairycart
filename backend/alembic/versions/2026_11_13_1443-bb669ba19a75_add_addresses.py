"""add addresses

#102: saved delivery addresses (one default per user, a partial unique index), and a
text copy of the address on orders and subscriptions (NULL for rows from before #102).

Revision ID: bb669ba19a75
Revises: 8be21a99d8af
Create Date: 2026-11-13 14:43:15.834559

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "bb669ba19a75"
down_revision: str | Sequence[str] | None = "8be21a99d8af"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "addresses",
        sa.Column("address_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("label", sa.String(length=30), nullable=False),
        sa.Column("house", sa.String(length=100), nullable=False),
        sa.Column("street", sa.String(length=150), nullable=False),
        sa.Column("landmark", sa.String(length=100), nullable=True),
        sa.Column("city", sa.String(length=50), nullable=False),
        sa.Column("pincode", sa.String(length=6), nullable=False),
        sa.Column("is_default", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("pincode ~ '^[1-9][0-9]{5}$'", name=op.f("ck_addresses_pincode_format")),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.user_id"],
            name=op.f("addresses_user_id_fkey"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("address_id", name=op.f("addresses_pkey")),
    )
    op.create_index("idx_addresses_user_id", "addresses", ["user_id"], unique=False)
    op.create_index(
        "uq_addresses_one_default_per_user",
        "addresses",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("is_default"),
    )
    op.add_column("orders", sa.Column("delivery_address", sa.String(length=500), nullable=True))
    op.add_column(
        "subscriptions",
        sa.Column("delivery_address", sa.String(length=500), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("subscriptions", "delivery_address")
    op.drop_column("orders", "delivery_address")
    op.drop_index(
        "uq_addresses_one_default_per_user",
        table_name="addresses",
        postgresql_where=sa.text("is_default"),
    )
    op.drop_index("idx_addresses_user_id", table_name="addresses")
    op.drop_table("addresses")
