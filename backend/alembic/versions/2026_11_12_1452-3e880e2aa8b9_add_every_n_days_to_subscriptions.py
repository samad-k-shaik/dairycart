"""add every_n_days to subscriptions

#99: deliver every day (1), every 2nd day (2) or every 3rd day (3). Existing
subscriptions get 1 (every day), which is what they were. The CHECK constraint was added
by hand: autogenerate does not detect CHECK constraints on existing tables.

Revision ID: 3e880e2aa8b9
Revises: 90b9ebede4c0
Create Date: 2026-11-12 14:52:47.974964

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "3e880e2aa8b9"
down_revision: str | Sequence[str] | None = "90b9ebede4c0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "subscriptions",
        sa.Column("every_n_days", sa.Integer(), server_default="1", nullable=False),
    )
    op.create_check_constraint(
        op.f("ck_subscriptions_every_n_days_allowed"),
        "subscriptions",
        "every_n_days IN (1,2,3)",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        op.f("ck_subscriptions_every_n_days_allowed"), "subscriptions", type_="check"
    )
    op.drop_column("subscriptions", "every_n_days")
