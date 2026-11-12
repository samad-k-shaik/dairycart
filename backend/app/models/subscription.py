"""SUBSCRIPTIONS and SUBSCRIPTION_ITEMS tables (#97, docs/04-architecture/database-erd.md).

A subscription = the same items delivered every day for 7, 15 or 30 days. It does not
deliver anything by itself: each day an admin (or a script) runs "generate orders", which
creates one normal ORDER per active subscription (orders.subscription_id + delivery_date).
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Numeric,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.customer import Customer
    from app.models.product import Product


class SubscriptionPlan(StrEnum):
    """How long a subscription runs. The number of days is in PLAN_DAYS."""

    WEEK = "WEEK"
    HALF_MONTH = "HALF_MONTH"
    MONTH = "MONTH"


# One place for the plan lengths: the service, the API and the tests all use this.
PLAN_DAYS: dict[SubscriptionPlan, int] = {
    SubscriptionPlan.WEEK: 7,
    SubscriptionPlan.HALF_MONTH: 15,
    SubscriptionPlan.MONTH: 30,
}


class SubscriptionStatus(StrEnum):
    """ACTIVE: orders are still created. CANCELLED: the user (or an admin) stopped it.
    COMPLETED: the last day has passed."""

    ACTIVE = "ACTIVE"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"


def _values_sql(enum: type[StrEnum]) -> str:
    return ",".join(f"'{member.value}'" for member in enum)


def _string_enum(enum: type[StrEnum]) -> Enum:
    """VARCHAR(20) + our own CHECK, like orders.status (easier to change than a native enum)."""
    return Enum(
        enum,
        native_enum=False,
        create_constraint=False,
        length=20,
        values_callable=lambda members: [m.value for m in members],
    )


class Subscription(Base):
    __tablename__ = "subscriptions"
    __table_args__ = (
        CheckConstraint(
            f"plan IN ({_values_sql(SubscriptionPlan)})", name="plan_allowed"
        ),
        CheckConstraint(
            f"status IN ({_values_sql(SubscriptionStatus)})", name="status_allowed"
        ),
        CheckConstraint("end_date >= start_date", name="end_after_start"),
        CheckConstraint("daily_total >= 0", name="daily_total_non_negative"),
        Index("idx_subscriptions_user_id", "user_id"),
        Index("idx_subscriptions_status", "status"),
        # One ACTIVE subscription per user, guaranteed by the DATABASE: a "partial" unique
        # index only looks at rows where status = 'ACTIVE', so old cancelled/completed
        # subscriptions do not count.
        Index(
            "uq_subscriptions_one_active_per_user",
            "user_id",
            unique=True,
            postgresql_where=text("status = 'ACTIVE'"),
        ),
    )

    subscription_id: Mapped[int] = mapped_column(primary_key=True)
    # RESTRICT: an account or customer with subscriptions cannot be deleted (history).
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.user_id", ondelete="RESTRICT")
    )
    # Delivery contact (name + phone from the form), the same table orders use.
    customer_id: Mapped[int] = mapped_column(
        ForeignKey("customers.customer_id", ondelete="RESTRICT")
    )
    plan: Mapped[SubscriptionPlan] = mapped_column(_string_enum(SubscriptionPlan))
    start_date: Mapped[date] = mapped_column(Date)
    # Last delivery day, INCLUDED: a 7-day plan from the 1st ends on the 7th.
    end_date: Mapped[date] = mapped_column(Date)
    status: Mapped[SubscriptionStatus] = mapped_column(
        _string_enum(SubscriptionStatus),
        default=SubscriptionStatus.ACTIVE,
        server_default=SubscriptionStatus.ACTIVE.value,
    )
    # One day's total from the LOCKED prices (sum of the item subtotals).
    daily_total: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    cancelled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )

    customer: Mapped[Customer] = relationship()
    items: Mapped[list[SubscriptionItem]] = relationship(
        back_populates="subscription",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    @property
    def days(self) -> int:
        return PLAN_DAYS[self.plan]

    def __repr__(self) -> str:
        return (
            f"Subscription(subscription_id={self.subscription_id!r}, "
            f"plan={self.plan!r}, status={self.status!r})"
        )


class SubscriptionItem(Base):
    """One line of a subscription: product, daily quantity and the LOCKED price."""

    __tablename__ = "subscription_items"
    __table_args__ = (
        CheckConstraint("quantity BETWEEN 1 AND 20", name="quantity_range"),
        CheckConstraint("unit_price > 0", name="unit_price_positive"),
        CheckConstraint("subtotal >= 0", name="subtotal_non_negative"),
        UniqueConstraint(
            "subscription_id", "product_id", name="uq_subscription_items_product"
        ),
    )

    subscription_item_id: Mapped[int] = mapped_column(primary_key=True)
    subscription_id: Mapped[int] = mapped_column(
        ForeignKey("subscriptions.subscription_id", ondelete="CASCADE")
    )
    # RESTRICT: a product in a subscription cannot be deleted (mark it unavailable).
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.product_id", ondelete="RESTRICT")
    )
    quantity: Mapped[int]
    # Price when the user subscribed. Every day's order uses this price, so the plan
    # total shown at checkout stays true even if the product price changes (#97).
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2))

    subscription: Mapped[Subscription] = relationship(back_populates="items")
    product: Mapped[Product] = relationship()
