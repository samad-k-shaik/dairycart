"""Delivery boy app schemas (#109, docs/05-api/api-contracts.md → Delivery boy app).

What a logged-in delivery boy sees: his own record and the orders to deliver in his areas.
Only what he needs to deliver: no prices per item, no account details of the customer.
"""

from datetime import date
from typing import Literal, Self

from pydantic import BaseModel, ConfigDict

from app.models import DeliveryBoy, Order, OrderStatus
from app.schemas.common import Money
from app.schemas.delivery_boy import AreaRead


class DeliveryMeRead(BaseModel):
    """GET /delivery/me"""

    delivery_boy_id: int
    name: str
    phone: str
    areas: list[AreaRead]

    @classmethod
    def from_boy(cls, boy: DeliveryBoy) -> Self:
        return cls(
            delivery_boy_id=boy.delivery_boy_id,
            name=boy.name,
            phone=boy.phone,
            areas=[AreaRead.model_validate(area) for area in boy.areas],
        )


class DeliveryLine(BaseModel):
    product_name: str
    size: str
    quantity: int


class DeliveryOrderRead(BaseModel):
    """One order on GET /delivery/me/orders."""

    order_id: int
    status: OrderStatus
    # Null for one-time orders (they are delivered the day they are placed).
    delivery_date: date | None
    delivery_slot: str | None
    # The delivery contact typed at checkout (name + phone to call at the door).
    customer_name: str
    customer_phone: str
    delivery_address: str | None
    delivery_pincode: str | None
    delivery_latitude: float | None  # #108: the customer's map pin, if any
    delivery_longitude: float | None
    # To collect on delivery (cash on delivery, see docs/02-project-scope.md).
    total_amount: Money
    items: list[DeliveryLine]

    @classmethod
    def from_order(cls, order: Order) -> Self:
        return cls(
            order_id=order.order_id,
            status=order.status,
            delivery_date=order.delivery_date,
            delivery_slot=order.delivery_slot,
            customer_name=order.customer.name,
            customer_phone=order.customer.phone,
            delivery_address=order.delivery_address,
            delivery_pincode=order.delivery_pincode,
            delivery_latitude=order.delivery_latitude,
            delivery_longitude=order.delivery_longitude,
            total_amount=order.total_amount,
            items=[
                DeliveryLine(
                    product_name=item.product.name,
                    size=item.product.size,
                    quantity=item.quantity,
                )
                for item in sorted(order.items, key=lambda i: i.order_item_id)
            ],
        )


class DeliveryStatusUpdate(BaseModel):
    """PATCH /delivery/me/orders/{id}/status. A delivery boy may only move an order to
    OUT_FOR_DELIVERY or DELIVERED; confirming and cancelling stay with the admin."""

    model_config = ConfigDict(extra="forbid")

    status: Literal[OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED]
