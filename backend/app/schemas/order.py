"""Order API schemas (M3-01, docs/05-api/api-contracts.md → orders and admin orders).

Requests have `extra="forbid"`: a client that sends `price`, `unit_price` or `total_amount`
gets a 422. The backend calculates every price and total from the database (BR-2).
"""

from datetime import date
from typing import Annotated, Self

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.models import DeliveryBoy, Order, OrderStatus
from app.schemas.common import Money, Phone, UtcDateTime

# ---- Requests ----

CustomerName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=2, max_length=100)
]


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
    # #102: one of the user's saved addresses. Not sent → the user's default address;
    # a user with no address at all gets 422 (field "address_id").
    address_id: int | None = Field(default=None, gt=0)


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
    # #97: set for orders created from a subscription (null for one-time orders).
    subscription_id: int | None = None
    delivery_date: date | None = None
    # #100: the delivery time, e.g. "Morning, 8:00 AM – 9:00 AM" (null: one-time order).
    delivery_slot: str | None = None
    # #102: where to deliver (copy of the address; null for orders from before #102).
    delivery_address: str | None = None
    # #108: copy of the address's map pin (null when the address had none).
    delivery_latitude: float | None = None
    delivery_longitude: float | None = None

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
            subscription_id=order.subscription_id,
            delivery_date=order.delivery_date,
            delivery_slot=order.delivery_slot,
            delivery_address=order.delivery_address,
            delivery_latitude=order.delivery_latitude,
            delivery_longitude=order.delivery_longitude,
        )


class OrderSummary(BaseModel):
    """One row of the customer's order history (GET /orders?phone=)."""

    order_id: int
    order_date: UtcDateTime
    status: OrderStatus
    total_amount: Money
    item_count: int
    # #97: the subscription this order came from (null for a one-time order).
    subscription_id: int | None = None
    delivery_slot: str | None = None  # #100


class AssignedBoy(BaseModel):
    """The ACTIVE delivery boy who covers an order's PIN code (#103)."""

    delivery_boy_id: int
    name: str
    phone: str


class BoyCount(BaseModel):
    """How many orders a delivery boy has in the current view (#103, #104)."""

    delivery_boy_id: int
    name: str
    orders: int


class AdminOrderLine(BaseModel):
    """#104: one item on an Orders board card."""

    product_id: int
    product_name: str
    size: str
    quantity: int
    unit_price: Money
    subtotal: Money


class AdminOrderSummary(BaseModel):
    """One card of the admin Orders board (GET /admin/orders)."""

    order_id: int
    customer_name: str
    customer_phone: str
    order_date: UtcDateTime
    status: OrderStatus
    total_amount: Money
    item_count: int
    # #97: the subscription this order came from (null for a one-time order).
    subscription_id: int | None = None
    delivery_slot: str | None = None  # #100
    # #104: the card's details. Null user only for old guest orders (before #90).
    user_id: int | None = None
    account_name: str | None = None  # #121: the account holder's full name
    delivery_date: date | None = None
    delivery_pincode: str | None = None  # #103
    delivery_boy: AssignedBoy | None = None  # #103: by PIN code; null = not assigned
    items: list[AdminOrderLine] = []

    @classmethod
    def from_order(cls, order: Order, account_name: str | None, boy: DeliveryBoy | None) -> Self:
        lines = sorted(order.items, key=lambda i: i.order_item_id)
        return cls(
            order_id=order.order_id,
            customer_name=order.customer.name,
            customer_phone=order.customer.phone,
            order_date=order.order_date,
            status=order.status,
            total_amount=order.total_amount,
            item_count=len(lines),
            subscription_id=order.subscription_id,
            delivery_slot=order.delivery_slot,
            user_id=order.user_id,
            account_name=account_name,
            delivery_date=order.delivery_date,
            delivery_pincode=order.delivery_pincode,
            delivery_boy=(
                AssignedBoy(delivery_boy_id=boy.delivery_boy_id, name=boy.name, phone=boy.phone)
                if boy
                else None
            ),
            items=[
                AdminOrderLine(
                    product_id=item.product_id,
                    product_name=item.product.name,
                    size=item.product.size,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    subtotal=item.subtotal,
                )
                for item in lines
            ],
        )


class AdminOrderPage(BaseModel):
    items: list[AdminOrderSummary]
    page: int
    page_size: int
    total: int
    # Counts for the date / boy / search filters, ignoring the status filter (all
    # orders when those filters are not used); feeds the dashboard and the chips.
    status_counts: dict[OrderStatus, int]
    # #104: orders per active delivery boy and unassigned ones (ignoring boy + status).
    boy_counts: list[BoyCount] = []
    unassigned_count: int = 0
