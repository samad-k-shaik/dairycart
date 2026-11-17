"""login by mobile number

#121: a user account logs in with its mobile number + password. `users.phone` is added
(unique, 10 digits) and `users.email` / `users.username` are removed.

Existing accounts have no mobile number, and inventing one would create logins nobody
knows. Nothing is deployed yet (M6), so only local data can be affected: the upgrade
STOPS if the users table has rows and explains how to reset the local database.
This guard was written by hand (autogenerate cannot do it).

Revision ID: b2526ba63844
Revises: 99af8de2905d
Create Date: 2026-11-15 19:23:51.099814

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b2526ba63844"
down_revision: str | Sequence[str] | None = "99af8de2905d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

RESET_HELP = """
#121 changes the login from username/email to mobile number, and the users table
already has {count} account(s) without a mobile number. Nothing was changed.

This only happens with old LOCAL data. Reset the local database, then start again:

    docker compose down -v      # deletes the local database volume (all local data)
    docker compose up --build   # migrations, seed data and the admin (mobile 9000000001)

Without Docker: drop and re-create the database, then run
`alembic upgrade head`, `python -m app.scripts.seed` and
`python -m app.scripts.create_admin --phone <mobile> --full-name "<name>"`.
"""


def upgrade() -> None:
    """Upgrade schema."""
    count = op.get_bind().scalar(sa.text("SELECT count(*) FROM users"))
    if count:
        raise RuntimeError(RESET_HELP.format(count=count))

    op.add_column("users", sa.Column("phone", sa.String(length=10), nullable=False))
    op.create_unique_constraint(op.f("uq_users_phone"), "users", ["phone"])
    op.create_check_constraint(op.f("ck_users_phone_format"), "users", "phone ~ '^[6-9][0-9]{9}$'")
    # Dropping a column also drops its unique constraint (uq_users_email/_username).
    op.drop_column("users", "email")
    op.drop_column("users", "username")


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column("users", sa.Column("email", sa.String(length=254), nullable=True))
    op.add_column("users", sa.Column("username", sa.String(length=30), nullable=True))
    # Accounts created after #121 have no email/username: give them unique placeholders
    # (".invalid" is a reserved domain that can never receive mail).
    op.execute(
        "UPDATE users SET email = 'user' || user_id || '@example.invalid', "
        "username = 'user' || user_id"
    )
    op.alter_column("users", "email", nullable=False)
    op.alter_column("users", "username", nullable=False)
    op.create_unique_constraint(op.f("uq_users_email"), "users", ["email"])
    op.create_unique_constraint(op.f("uq_users_username"), "users", ["username"])
    # Dropping the column also drops uq_users_phone and ck_users_phone_format.
    op.drop_column("users", "phone")
