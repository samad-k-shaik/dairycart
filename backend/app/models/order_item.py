"""ORDER_ITEMS table: the junction between orders and products (docs/04-architecture/database-erd.md)."""

from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Index, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.order import Order
    from app.models.product import Product


class OrderItem(Base):
    """One line of an order: which product, how many, and the price paid."""

    __tablename__ = "order_items"
    __table_args__ = (
        CheckConstraint("quantity BETWEEN 1 AND 20", name="quantity_range"),
        CheckConstraint("unit_price > 0", name="unit_price_positive"),
        CheckConstraint("subtotal >= 0", name="subtotal_non_negative"),
        # One line per product per order (BR-4).
        UniqueConstraint("order_id", "product_id", name="uq_order_items_order_product"),
        Index("idx_order_items_order", "order_id"),  # loading the items of an order
    )

    order_item_id: Mapped[int] = mapped_column(primary_key=True)
    # CASCADE: deleting an order deletes its lines (they mean nothing on their own).
    order_id: Mapped[int] = mapped_column(
        ForeignKey("orders.order_id", ondelete="CASCADE")
    )
    # RESTRICT: a product that appears in any order cannot be deleted (set
    # is_available = false instead), so order history always shows what was bought.
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.product_id", ondelete="RESTRICT")
    )
    quantity: Mapped[int]
    # Price SNAPSHOT copied from products.price at order time (BR-1): later price changes
    # do not change old orders.
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    # unit_price × quantity, calculated by the backend (BR-2).
    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2))

    order: Mapped[Order] = relationship(back_populates="items")
    product: Mapped[Product] = relationship(back_populates="order_items")

    def __repr__(self) -> str:
        return (
            f"OrderItem(order_item_id={self.order_item_id!r}, product_id={self.product_id!r}, "
            f"quantity={self.quantity!r})"
        )
