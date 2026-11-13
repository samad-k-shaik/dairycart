"""ADDRESSES table (#102, docs/04-architecture/database-erd.md).

A user's saved delivery addresses (Home, Office…). One of them is the default. Orders and
subscriptions do not point to an address row: they keep a TEXT COPY of it
(`delivery_address`), like locked prices, so editing or deleting an address never
changes where a past order went.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    false,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base

# The most addresses one user can keep.
MAX_ADDRESSES_PER_USER = 10
# Indian PIN code: 6 digits, not starting with 0.
PINCODE_PATTERN = r"^[1-9][0-9]{5}$"


class Address(Base):
    __tablename__ = "addresses"
    __table_args__ = (
        CheckConstraint(f"pincode ~ '{PINCODE_PATTERN}'", name="pincode_format"),
        Index("idx_addresses_user_id", "user_id"),
        # At most ONE default address per user, guaranteed by the database (a partial
        # unique index only looks at rows where is_default is true).
        Index(
            "uq_addresses_one_default_per_user",
            "user_id",
            unique=True,
            postgresql_where=text("is_default"),
        ),
    )

    address_id: Mapped[int] = mapped_column(primary_key=True)
    # CASCADE: the addresses belong to the account (orders keep their own copy).
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE")
    )
    label: Mapped[str] = mapped_column(String(30))  # "Home", "Office"…
    house: Mapped[str] = mapped_column(String(100))  # house / flat number, building
    street: Mapped[str] = mapped_column(String(150))  # street / area
    landmark: Mapped[str | None] = mapped_column(String(100), default=None)
    city: Mapped[str] = mapped_column(String(50))
    pincode: Mapped[str] = mapped_column(String(6))
    is_default: Mapped[bool] = mapped_column(
        Boolean, server_default=false(), default=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    @property
    def full_text(self) -> str:
        """One line, as copied onto orders:
        "12-3 Sai Residency, MG Road, Ameerpet, Near metro station, Hyderabad - 500016"."""
        parts = [
            self.house,
            self.street,
            self.landmark,
            f"{self.city} - {self.pincode}",
        ]
        return ", ".join(part for part in parts if part)

    def __repr__(self) -> str:
        # No street or house: addresses are personal data.
        return f"Address(address_id={self.address_id!r}, label={self.label!r})"
