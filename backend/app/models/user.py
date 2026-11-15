"""USERS table (#89): people who sign up and log in.

Separate from CUSTOMERS on purpose: ordering still works without an account (guest checkout,
customer found by phone). A user account is for the user dashboard and the admin area.
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
    )

    user_id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(100))
    # Stored in lower case, so "Ravi@Mail.com" and "ravi@mail.com" are the same account.
    # unique=True also creates the index used to find a user at login.
    email: Mapped[str] = mapped_column(String(254), unique=True)
    # Stored in lower case too (3–30 letters, digits, dot, dash, underscore).
    username: Mapped[str] = mapped_column(String(30), unique=True)
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
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def __repr__(self) -> str:
        # Never include the email or the hash: reprs end up in logs.
        return f"User(user_id={self.user_id!r}, role={self.role!r})"
