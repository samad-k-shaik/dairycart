"""ORDERS table and the OrderStatus enum (docs/04-architecture/database-erd.md)."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Numeric,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.customer import Customer
    from app.models.order_item import OrderItem


class OrderStatus(StrEnum):
    """Order lifecycle states (functional requirements → Order status lifecycle).

    StrEnum: each member IS a string, so OrderStatus.PLACED == "PLACED".
    Allowed transitions between them are business rules (services, M3-06).
    """

    PLACED = "PLACED"
    CONFIRMED = "CONFIRMED"
    OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"


# "'PLACED','CONFIRMED',..." built from the enum, so the CHECK constraint can never drift.
_STATUS_VALUES_SQL = ",".join(f"'{status.value}'" for status in OrderStatus)


class Order(Base):
    """One order: who ordered, when, the backend-calculated total and its status."""

    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint("total_amount >= 0", name="total_amount_non_negative"),
        CheckConstraint(f"status IN ({_STATUS_VALUES_SQL})", name="status_allowed"),
        Index("idx_orders_customer_id", "customer_id"),  # order history by customer
        Index("idx_orders_status", "status"),  # admin filter by status
    )

    order_id: Mapped[int] = mapped_column(primary_key=True)
    # RESTRICT: a customer who has orders cannot be deleted (protects order history).
    customer_id: Mapped[int] = mapped_column(
        ForeignKey("customers.customer_id", ondelete="RESTRICT")
    )
    # Stored in UTC (TIMESTAMPTZ); shown in IST by the frontend.
    order_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    # Sum of the item subtotals, calculated by the backend service (never sent by clients).
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    # VARCHAR(20) + the CHECK above, not a native PostgreSQL enum (easier to change later).
    # native_enum=False and create_constraint=False make SQLAlchemy use a plain VARCHAR and
    # leave the CHECK to us; Python still gets an OrderStatus member back.
    status: Mapped[OrderStatus] = mapped_column(
        Enum(
            OrderStatus,
            native_enum=False,
            create_constraint=False,
            length=20,
            values_callable=lambda statuses: [s.value for s in statuses],
        ),
        default=OrderStatus.PLACED,
        server_default=OrderStatus.PLACED.value,
    )

    customer: Mapped[Customer] = relationship(back_populates="orders")
    # An order owns its lines: deleting an order deletes them (also ON DELETE CASCADE in
    # the database; passive_deletes lets PostgreSQL do it instead of loading them first).
    items: Mapped[list[OrderItem]] = relationship(
        back_populates="order", cascade="all, delete-orphan", passive_deletes=True
    )

    def __repr__(self) -> str:
        return f"Order(order_id={self.order_id!r}, status={self.status!r})"
