"""Subscription API schemas (#97, docs/05-api/api-contracts.md → Subscriptions).

Like orders, requests carry only product ids and quantities (extra="forbid"): prices and
totals are always calculated by the backend from the database.
"""

from datetime import date
from typing import Self

from pydantic import BaseModel, ConfigDict, Field

from app.models import Subscription, SubscriptionPlan, SubscriptionStatus
from app.schemas.common import Money, UtcDateTime
from app.schemas.order import CustomerIn, CustomerRead, OrderItemIn

# ---- Requests ----


class SubscriptionCreate(BaseModel):
    """POST /subscriptions. start_date must be between tomorrow and 30 days from today
    (India time); that rule needs "today", so it is checked in the service."""

    model_config = ConfigDict(extra="forbid")

    plan: SubscriptionPlan
    start_date: date
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
    start_date: date
    end_date: date
    status: SubscriptionStatus
    customer: CustomerRead
    items: list[SubscriptionItemRead]
    daily_total: Money
    plan_total: Money
    # How many daily orders have been created so far.
    orders_created: int
    created_at: UtcDateTime
    cancelled_at: UtcDateTime | None

    @classmethod
    def from_subscription(cls, subscription: Subscription, orders_created: int) -> Self:
        return cls(
            subscription_id=subscription.subscription_id,
            plan=subscription.plan,
            days=subscription.days,
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
            plan_total=subscription.daily_total * subscription.days,
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
    start_date: date
    end_date: date
    status: SubscriptionStatus
    daily_total: Money
    orders_created: int


class GeneratedOrder(BaseModel):
    subscription_id: int
    order_id: int


class SkippedSubscription(BaseModel):
    subscription_id: int
    reason: str


class GenerateOrdersResult(BaseModel):
    """POST /admin/subscriptions/generate-orders: what happened for that day."""

    delivery_date: date
    created: list[GeneratedOrder]
    # Already had an order for that day (the button was pressed before).
    already_created: int
    skipped: list[SkippedSubscription]
    # Subscriptions whose last day had passed and are now COMPLETED.
    completed: int
