"""Subscription API schemas (#97, docs/05-api/api-contracts.md → Subscriptions).

Like orders, requests carry only product ids and quantities (extra="forbid"): prices and
totals are always calculated by the backend from the database.
"""

from datetime import date
from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field

from app.models import Subscription, SubscriptionPlan, SubscriptionStatus
from app.schemas.common import Money, UtcDateTime
from app.schemas.delivery_slot import BookedSlotRead
from app.schemas.order import CustomerIn, CustomerRead, OrderItemIn

# ---- Requests ----


class SubscriptionCreate(BaseModel):
    """POST /subscriptions. start_date must be between tomorrow and 30 days from today
    (India time); that rule needs "today", so it is checked in the service."""

    model_config = ConfigDict(extra="forbid")

    plan: SubscriptionPlan
    start_date: date
    # #99: deliver every day (1), every 2nd day (2) or every 3rd day (3).
    every_n_days: Literal[1, 2, 3] = 1
    # #100: the delivery time slot (GET /delivery-slots). Required.
    delivery_slot_id: int = Field(gt=0)
    # #102: one of the user's saved addresses (not sent → the default address).
    address_id: int | None = Field(default=None, gt=0)
    customer: CustomerIn
    items: list[OrderItemIn] = Field(min_length=1, max_length=10)


# ---- Responses ----


class SubscriptionItemRead(BaseModel):
    product_id: int
    product_name: str
    size: str
    quantity: int
    unit_price: Money
    subtotal: Money


class SubscriptionRead(BaseModel):
    """One subscription with its items and totals."""

    subscription_id: int
    plan: SubscriptionPlan
    days: int
    every_n_days: int
    # How many deliveries the plan has (#99): 7 days every 2 days → 4.
    deliveries: int
    # #100: the booked delivery time (null for subscriptions from before #100).
    delivery_slot: BookedSlotRead | None
    # #102: where to deliver (null for subscriptions from before #102).
    delivery_address: str | None
    start_date: date
    end_date: date
    status: SubscriptionStatus
    customer: CustomerRead
    items: list[SubscriptionItemRead]
    # One delivery's total (named "daily" before #99 added every 2 / 3 days).
    daily_total: Money
    # daily_total × deliveries.
    plan_total: Money
    # How many delivery orders have been created so far.
    orders_created: int
    created_at: UtcDateTime
    cancelled_at: UtcDateTime | None

    @classmethod
    def from_subscription(cls, subscription: Subscription, orders_created: int) -> Self:
        return cls(
            subscription_id=subscription.subscription_id,
            plan=subscription.plan,
            days=subscription.days,
            every_n_days=subscription.every_n_days,
            deliveries=subscription.deliveries,
            delivery_slot=(
                BookedSlotRead.model_validate(subscription.delivery_slot)
                if subscription.delivery_slot
                else None
            ),
            delivery_address=subscription.delivery_address,
            start_date=subscription.start_date,
            end_date=subscription.end_date,
            status=subscription.status,
            customer=CustomerRead.model_validate(subscription.customer),
            items=[
                SubscriptionItemRead(
                    product_id=item.product_id,
                    product_name=item.product.name,
                    size=item.product.size,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    subtotal=item.subtotal,
                )
                for item in sorted(
                    subscription.items, key=lambda i: i.subscription_item_id
                )
            ],
            daily_total=subscription.daily_total,
            plan_total=subscription.daily_total * subscription.deliveries,
            orders_created=orders_created,
            created_at=subscription.created_at,
            cancelled_at=subscription.cancelled_at,
        )


class AdminSubscriptionSummary(BaseModel):
    """One row of GET /admin/subscriptions."""

    subscription_id: int
    username: str
    customer_name: str
    customer_phone: str
    plan: SubscriptionPlan
    every_n_days: int
    delivery_slot: str | None  # #100: "Morning, 8:00 AM – 9:00 AM"
    start_date: date
    end_date: date
    status: SubscriptionStatus
    daily_total: Money
    orders_created: int
