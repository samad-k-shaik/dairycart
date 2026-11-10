"""Order API schemas (M3-01, docs/05-api/api-contracts.md → orders and admin orders).

Requests have `extra="forbid"`: a client that sends `price`, `unit_price` or `total_amount`
gets a 422. The backend calculates every price and total from the database (BR-2).
"""

from typing import Annotated, Self

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.models import Order, OrderStatus
from app.schemas.common import Money, UtcDateTime

# ---- Requests ----

CustomerName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=2, max_length=100)
]
# 10-digit Indian mobile number: starts with 6, 7, 8 or 9.
Phone = Annotated[str, StringConstraints(pattern=r"^[6-9]\d{9}$")]


class CustomerIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: CustomerName
    phone: Phone


class OrderItemIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product_id: int = Field(gt=0)
    quantity: int = Field(ge=1, le=20)


class OrderCreate(BaseModel):
    """POST /orders. Only ids and quantities: never prices or totals.

    Duplicate product ids are checked in the service, so the error can have its own code
    (400 DUPLICATE_PRODUCT) instead of a generic 422.
    """

    model_config = ConfigDict(extra="forbid")

    customer: CustomerIn
    items: list[OrderItemIn] = Field(min_length=1, max_length=10)


class StatusUpdate(BaseModel):
    """PATCH /admin/orders/{id}/status. An unknown status → 422."""

    model_config = ConfigDict(extra="forbid")

    status: OrderStatus


# ---- Responses ----


class CustomerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    customer_id: int
    name: str
    phone: str


class OrderItemRead(BaseModel):
    order_item_id: int
    product_id: int
    product_name: str
    size: str
    quantity: int
    unit_price: Money
    subtotal: Money


class OrderRead(BaseModel):
    """Full order: POST /orders (201), GET /orders/{id}, PATCH .../status."""

    order_id: int
    customer: CustomerRead
    order_date: UtcDateTime
    status: OrderStatus
    items: list[OrderItemRead]
    total_amount: Money

    @classmethod
    def from_order(cls, order: Order) -> Self:
        """Database order → contract shape. product_name and size come from the
        product; unit_price is the price stored on the order item (BR-1)."""
        return cls(
            order_id=order.order_id,
            customer=CustomerRead.model_validate(order.customer),
            order_date=order.order_date,
            status=order.status,
            items=[
                OrderItemRead(
                    order_item_id=item.order_item_id,
                    product_id=item.product_id,
                    product_name=item.product.name,
                    size=item.product.size,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    subtotal=item.subtotal,
                )
                for item in sorted(order.items, key=lambda i: i.order_item_id)
            ],
            total_amount=order.total_amount,
        )


class OrderSummary(BaseModel):
    """One row of the customer's order history (GET /orders?phone=)."""

    order_id: int
    order_date: UtcDateTime
    status: OrderStatus
    total_amount: Money
    item_count: int


class AdminOrderSummary(BaseModel):
    """One row of the admin order list (GET /admin/orders)."""

    order_id: int
    customer_name: str
    customer_phone: str
    order_date: UtcDateTime
    status: OrderStatus
    total_amount: Money
    item_count: int


class AdminOrderPage(BaseModel):
    items: list[AdminOrderSummary]
    page: int
    page_size: int
    total: int
    # Counts across ALL orders (ignores the status filter); feeds the dashboard.
    status_counts: dict[OrderStatus, int]
