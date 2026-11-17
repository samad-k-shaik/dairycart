"""SUBSCRIPTIONS and SUBSCRIPTION_ITEMS tables (#97, docs/04-architecture/database-erd.md).

A subscription = the same items delivered for 7, 15 or 30 days (every 1, 2 or 3 days,
#99) in the delivery time slot the user booked (#100). The backend creates one normal
ORDER per delivery day automatically (orders.subscription_id + delivery_date).
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
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.map_pin import coordinate_type, pin_checks

if TYPE_CHECKING:
    from app.models.customer import Customer
    from app.models.delivery_slot import DeliverySlot
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


# #99: deliver every day, every 2nd day or every 3rd day.
DELIVERY_INTERVALS: tuple[int, ...] = (1, 2, 3)


def delivery_count(days: int, every_n_days: int) -> int:
    """Deliveries in a plan: days 1, 1+n, 1+2n, ... up to the last day.
    7 days every 2 days → days 1, 3, 5, 7 → 4."""
    return (days - 1) // every_n_days + 1


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
        CheckConstraint(f"plan IN ({_values_sql(SubscriptionPlan)})", name="plan_allowed"),
        CheckConstraint(f"status IN ({_values_sql(SubscriptionStatus)})", name="status_allowed"),
        CheckConstraint("end_date >= start_date", name="end_after_start"),
        CheckConstraint(
            f"every_n_days IN ({','.join(map(str, DELIVERY_INTERVALS))})",
            name="every_n_days_allowed",
        ),
        CheckConstraint("daily_total >= 0", name="daily_total_non_negative"),
        *pin_checks("delivery_latitude", "delivery_longitude"),  # #108
        Index("idx_subscriptions_user_id", "user_id"),
        Index("idx_subscriptions_status", "status"),
        Index("idx_subscriptions_delivery_slot_id", "delivery_slot_id"),  # #100
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
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id", ondelete="RESTRICT"))
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
    # #99: 1 = every day, 2 = every 2nd day, 3 = every 3rd day (from start_date).
    every_n_days: Mapped[int] = mapped_column(default=1, server_default="1")
    # #100: the booked delivery time. NULL only for subscriptions from before #100.
    # RESTRICT: a booked slot cannot be deleted (the admin switches it off instead).
    delivery_slot_id: Mapped[int | None] = mapped_column(
        ForeignKey("delivery_slots.delivery_slot_id", ondelete="RESTRICT"),
        default=None,
    )
    # #102: where to deliver (text copy of a saved address; NULL before #102). Every
    # delivery order copies it; "Change address" replaces it for the next deliveries.
    delivery_address: Mapped[str | None] = mapped_column(String(500), default=None)
    # #103: the PIN code of that address (copied onto every delivery order).
    delivery_pincode: Mapped[str | None] = mapped_column(String(6), default=None)
    # #108: a copy of the address's map pin (copied onto every delivery order).
    delivery_latitude: Mapped[float | None] = mapped_column(coordinate_type(), default=None)
    delivery_longitude: Mapped[float | None] = mapped_column(coordinate_type(), default=None)
    # One delivery's total from the LOCKED prices (sum of the item subtotals).
    daily_total: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)

    customer: Mapped[Customer] = relationship()
    delivery_slot: Mapped[DeliverySlot | None] = relationship()
    items: Mapped[list[SubscriptionItem]] = relationship(
        back_populates="subscription",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    @property
    def days(self) -> int:
        return PLAN_DAYS[self.plan]

    @property
    def deliveries(self) -> int:
        return delivery_count(self.days, self.every_n_days)

    def delivers_on(self, day: date) -> bool:
        """True if `day` is one of this plan's delivery days (#99)."""
        offset = (day - self.start_date).days
        return 0 <= offset and day <= self.end_date and offset % self.every_n_days == 0

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
        UniqueConstraint("subscription_id", "product_id", name="uq_subscription_items_product"),
    )

    subscription_item_id: Mapped[int] = mapped_column(primary_key=True)
    subscription_id: Mapped[int] = mapped_column(
        ForeignKey("subscriptions.subscription_id", ondelete="CASCADE")
    )
    # RESTRICT: a product in a subscription cannot be deleted (mark it unavailable).
    product_id: Mapped[int] = mapped_column(ForeignKey("products.product_id", ondelete="RESTRICT"))
    quantity: Mapped[int]
    # Price when the user subscribed. Every day's order uses this price, so the plan
    # total shown at checkout stays true even if the product price changes (#97).
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2))

    subscription: Mapped[Subscription] = relationship(back_populates="items")
    product: Mapped[Product] = relationship()
