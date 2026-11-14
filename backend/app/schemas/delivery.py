"""Admin daily deliveries schemas (#101, docs/05-api/api-contracts.md → Deliveries)."""

from datetime import date

from pydantic import BaseModel

from app.models import OrderStatus
from app.schemas.common import Money


class DeliveryItem(BaseModel):
    product_id: int
    product_name: str
    size: str
    quantity: int


class AssignedBoy(BaseModel):
    """#103: the delivery boy who covers the order's PIN code."""

    delivery_boy_id: int
    name: str
    phone: str


class BoyCount(BaseModel):
    """#103: how many orders a delivery boy has that day."""

    delivery_boy_id: int
    name: str
    orders: int


class DeliveryRow(BaseModel):
    """One order to deliver that day."""

    order_id: int
    user_id: int | None
    # None only for old guest orders from before accounts (#90).
    username: str | None
    customer_name: str
    customer_phone: str
    # Set for subscription deliveries; None for one-time orders.
    subscription_id: int | None
    # "Morning, 8:00 AM – 9:00 AM" (subscription orders only).
    delivery_slot: str | None
    # #103: the address's PIN code, and the delivery boy covering it (None: not assigned).
    delivery_pincode: str | None
    delivery_boy: AssignedBoy | None
    status: OrderStatus
    total_amount: Money
    items: list[DeliveryItem]


class ProductTotal(BaseModel):
    """How many of one product go out that day (cancelled orders not counted)."""

    product_id: int
    product_name: str
    size: str
    quantity: int


class DayDeliveries(BaseModel):
    """GET /admin/deliveries?date=YYYY-MM-DD"""

    date: date
    # Every status, 0 when none (like the admin order list).
    status_counts: dict[OrderStatus, int]
    product_totals: list[ProductTotal]
    # #103: orders per active delivery boy for the WHOLE day (ignores the filter), and
    # the orders no active delivery boy covers.
    boy_counts: list[BoyCount]
    unassigned_count: int
    deliveries: list[DeliveryRow]
