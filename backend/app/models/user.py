"""USERS table (#89): people who sign up and log in, with their mobile number (#121).

Separate from CUSTOMERS on purpose: users.phone is the LOGIN of the account, while
customers.phone is the delivery contact typed at checkout (BR-5). They are often the same
number, but someone may order for a parent at another number.
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from sqlalchemy import CheckConstraint, DateTime, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class UserRole(StrEnum):
    """USER: everyone who signs up. ADMIN: may use the admin area.

    ADMIN is never given by the API; only the create_admin script sets it.
    """

    USER = "USER"
    ADMIN = "ADMIN"


_ROLE_VALUES_SQL = ",".join(f"'{role.value}'" for role in UserRole)


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(f"role IN ({_ROLE_VALUES_SQL})", name="role_allowed"),
        # Same rule as the API (schemas/common.py → Phone): the database refuses a badly
        # formatted number even if it does not come through the API (e.g. a script).
        CheckConstraint("phone ~ '^[6-9][0-9]{9}$'", name="phone_format"),
    )

    user_id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(100))
    # #121: the login. 10-digit Indian mobile number, always saved without +91 or spaces.
    # unique=True: one account per number; it also creates the index used at login.
    phone: Mapped[str] = mapped_column(String(10), unique=True)
    # bcrypt hash (60 characters, includes its own random salt). NEVER the password itself.
    password_hash: Mapped[str] = mapped_column(String(100))
    # VARCHAR + CHECK (like orders.status), not a native PostgreSQL enum.
    role: Mapped[UserRole] = mapped_column(
        Enum(
            UserRole,
            native_enum=False,
            create_constraint=False,
            length=10,
            values_callable=lambda roles: [r.value for r in roles],
        ),
        default=UserRole.USER,
        server_default=UserRole.USER.value,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self) -> str:
        # Never include the phone number or the hash: reprs end up in logs.
        return f"User(user_id={self.user_id!r}, role={self.role!r})"
