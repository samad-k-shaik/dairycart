"""add delivery slots

#100: delivery time slots for subscriptions, managed by the admin.
- delivery_slots table, with the two standard slots inserted here (data, by hand):
  Morning 08:00–09:00 and Evening 17:00–18:00, capacity 50 each. The admin can edit them.
- subscriptions.delivery_slot_id: the booked slot (NULL for subscriptions from before).
- orders.delivery_slot: a text copy of the slot on each subscription delivery order.

Revision ID: 8be21a99d8af
Revises: 3e880e2aa8b9
Create Date: 2026-11-13 10:42:54.256363

"""

from collections.abc import Sequence
from datetime import time

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "8be21a99d8af"
down_revision: str | Sequence[str] | None = "3e880e2aa8b9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    delivery_slots = op.create_table(
        "delivery_slots",
        sa.Column("delivery_slot_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=False),
        sa.Column(
            "is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "capacity BETWEEN 1 AND 1000",
            name=op.f("ck_delivery_slots_capacity_range"),
        ),
        sa.CheckConstraint(
            "end_time > start_time", name=op.f("ck_delivery_slots_end_after_start")
        ),
        sa.PrimaryKeyConstraint("delivery_slot_id", name=op.f("delivery_slots_pkey")),
        sa.UniqueConstraint("start_time", "end_time", name="uq_delivery_slots_times"),
    )
    # The two standard slots, so customers always have a time to choose (#100).
    op.bulk_insert(
        delivery_slots,
        [
            {
                "name": "Morning",
                "start_time": time(8, 0),
                "end_time": time(9, 0),
                "capacity": 50,
            },
            {
                "name": "Evening",
                "start_time": time(17, 0),
                "end_time": time(18, 0),
                "capacity": 50,
            },
        ],
    )
    op.add_column(
        "orders", sa.Column("delivery_slot", sa.String(length=100), nullable=True)
    )
    op.add_column(
        "subscriptions", sa.Column("delivery_slot_id", sa.Integer(), nullable=True)
    )
    op.create_index(
        "idx_subscriptions_delivery_slot_id",
        "subscriptions",
        ["delivery_slot_id"],
        unique=False,
    )
    op.create_foreign_key(
        op.f("subscriptions_delivery_slot_id_fkey"),
        "subscriptions",
        "delivery_slots",
        ["delivery_slot_id"],
        ["delivery_slot_id"],
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        op.f("subscriptions_delivery_slot_id_fkey"), "subscriptions", type_="foreignkey"
    )
    op.drop_index("idx_subscriptions_delivery_slot_id", table_name="subscriptions")
    op.drop_column("subscriptions", "delivery_slot_id")
    op.drop_column("orders", "delivery_slot")
    op.drop_table("delivery_slots")
