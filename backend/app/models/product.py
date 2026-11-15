"""PRODUCTS table (docs/04-architecture/database-erd.md)."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Numeric,
    String,
    UniqueConstraint,
    func,
    true,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.order_item import OrderItem


class Product(Base):
    """A product in the catalogue, e.g. Cow Milk 1 Litre."""

    __tablename__ = "products"
    __table_args__ = (
        # Constraint names: the Base naming convention turns "price_positive" into
        # "ck_products_price_positive".
        CheckConstraint("price > 0", name="price_positive"),
        # Stock can never go below zero, even if two orders race (#92).
        CheckConstraint("stock_quantity >= 0", name="stock_quantity_non_negative"),
        UniqueConstraint("name", "size", name="uq_products_name_size"),
    )

    product_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    size: Mapped[str] = mapped_column(String(20))
    # Money: NUMERIC(10,2) in the database, exact Decimal in Python. Never float.
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    # Hidden from customers when False. Products are never deleted once ordered.
    is_available: Mapped[bool] = mapped_column(
        Boolean, server_default=true(), default=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    # How many bottles are left (#92). ADMIN-only: the public API never returns the
    # number, only `in_stock`. Orders reduce it; cancelling an order puts it back.
    stock_quantity: Mapped[int] = mapped_column(server_default="0", default=0)

    order_items: Mapped[list[OrderItem]] = relationship(back_populates="product")

    @property
    def in_stock(self) -> bool:
        """What customers may know: is there at least one bottle left?"""
        return self.stock_quantity > 0

    def __repr__(self) -> str:
        return f"Product(product_id={self.product_id!r}, name={self.name!r}, size={self.size!r})"
