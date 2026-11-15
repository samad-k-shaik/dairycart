"""add stock_quantity to products (#92)

Products already in the database start with 100 bottles each, so ordering keeps
working; the admin changes it later. New products default to 0 until the admin sets it.

Revision ID: 2a96d8df6e2a
Revises: fd53fd440336
Create Date: 2026-11-11 16:06:00.338624

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "2a96d8df6e2a"
down_revision: str | Sequence[str] | None = "fd53fd440336"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

EXISTING_PRODUCTS_STOCK = "100"


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Add the column. server_default fills every EXISTING row with 100.
    op.add_column(
        "products",
        sa.Column(
            "stock_quantity",
            sa.Integer(),
            server_default=EXISTING_PRODUCTS_STOCK,
            nullable=False,
        ),
    )
    # 2. From now on a new row without a value gets 0 (matches the model).
    op.alter_column("products", "stock_quantity", server_default="0")
    # 3. Stock can never go below zero. (Autogenerate does not detect CHECK
    #    constraints, so this line was added by hand.)
    op.create_check_constraint(
        op.f("ck_products_stock_quantity_non_negative"),
        "products",
        "stock_quantity >= 0",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        op.f("ck_products_stock_quantity_non_negative"), "products", type_="check"
    )
    op.drop_column("products", "stock_quantity")
