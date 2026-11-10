"""CUSTOMERS table (docs/04-architecture/database-erd.md)."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:  # imported only for type hints, avoids circular imports at runtime
    from app.models.order import Order


class Customer(Base):
    """A customer, identified by phone number (no login in the POC, ADR-003)."""

    __tablename__ = "customers"

    customer_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    # unique=True also creates the index used to find a customer by phone.
    phone: Mapped[str] = mapped_column(String(15), unique=True)
    # server_default: PostgreSQL fills it in with now() (UTC timestamp with time zone).
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # One customer → many orders. Customers with orders cannot be deleted (RESTRICT on
    # orders.customer_id), so no cascade here.
    orders: Mapped[list[Order]] = relationship(back_populates="customer")

    def __repr__(self) -> str:
        # Never include the phone number: reprs end up in logs.
        return f"Customer(customer_id={self.customer_id!r})"
