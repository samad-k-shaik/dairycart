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
    deliveries: list[DeliveryRow]
