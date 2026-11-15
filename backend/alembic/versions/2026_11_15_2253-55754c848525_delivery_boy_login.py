"""delivery boy login

#109: a delivery boy can log in. A new role DELIVERY_BOY on users (the role column grows
from VARCHAR(10) to VARCHAR(20) to fit it, and its CHECK constraint allows it), and
delivery_boys.user_id links a delivery boy to his account (nullable: no login yet).

The CHECK constraint change was written by hand (autogenerate does not compare CHECKs).

Revision ID: 55754c848525
Revises: aa76e3a3f9c4
Create Date: 2026-11-15 22:53:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "55754c848525"
down_revision: str | Sequence[str] | None = "aa76e3a3f9c4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column("users", "role", type_=sa.String(length=20), existing_type=sa.String(length=10))
    op.drop_constraint(op.f("ck_users_role_allowed"), "users", type_="check")
    op.create_check_constraint(
        op.f("ck_users_role_allowed"), "users", "role IN ('USER','ADMIN','DELIVERY_BOY')"
    )

    op.add_column("delivery_boys", sa.Column("user_id", sa.Integer(), nullable=True))
    op.create_unique_constraint(op.f("uq_delivery_boys_user_id"), "delivery_boys", ["user_id"])
    op.create_foreign_key(
        op.f("delivery_boys_user_id_fkey"),
        "delivery_boys",
        "users",
        ["user_id"],
        ["user_id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    """Downgrade schema.

    Delivery boy accounts cannot exist without the role, so they are deleted (their
    delivery boy records stay, without a login)."""
    op.drop_constraint(op.f("delivery_boys_user_id_fkey"), "delivery_boys", type_="foreignkey")
    op.drop_constraint(op.f("uq_delivery_boys_user_id"), "delivery_boys", type_="unique")
    op.drop_column("delivery_boys", "user_id")

    op.execute("DELETE FROM users WHERE role = 'DELIVERY_BOY'")
    op.drop_constraint(op.f("ck_users_role_allowed"), "users", type_="check")
    op.create_check_constraint(op.f("ck_users_role_allowed"), "users", "role IN ('USER','ADMIN')")
    op.alter_column("users", "role", type_=sa.String(length=10), existing_type=sa.String(length=20))
