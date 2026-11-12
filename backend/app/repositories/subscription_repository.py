"""Queries for subscriptions and their items (#97).

Like the order repository: eager loading (no N+1), row locks where two people could
change the same subscription at once, and flush-only writes (the service commits).
"""

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from sqlalchemy import Select, func, select, update
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models import (
    Customer,
    Order,
    Subscription,
    SubscriptionItem,
    SubscriptionPlan,
    SubscriptionStatus,
    User,
)


@dataclass(frozen=True)
class AdminSubscriptionRow:
    subscription_id: int
    username: str
    customer_name: str
    customer_phone: str
    plan: SubscriptionPlan
    start_date: date
    end_date: date
    status: SubscriptionStatus
    daily_total: Decimal
    orders_created: int


def _with_details(query: Select) -> Select:
    """Customer (1 JOIN) and items + their products (1 extra query), loaded eagerly."""
    return query.options(
        joinedload(Subscription.customer),
        selectinload(Subscription.items).joinedload(SubscriptionItem.product),
    )


def _orders_created() -> Select:
    """Number of orders made from the subscription in the current row."""
    return (
        select(func.count(Order.order_id))
        .where(Order.subscription_id == Subscription.subscription_id)
        .correlate(Subscription)
        .scalar_subquery()
    )


class SubscriptionRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, subscription: Subscription) -> Subscription:
        self.db.add(subscription)
        self.db.flush()  # INSERT now, so the id is known
        return subscription

    def get_with_items(self, subscription_id: int) -> Subscription | None:
        query = _with_details(
            select(Subscription).where(Subscription.subscription_id == subscription_id)
        )
        return self.db.scalars(query).unique().first()

    def get_for_update(self, subscription_id: int) -> Subscription | None:
        """LOCKS the row until commit, so a cancel and a "generate orders" run on the
        same subscription cannot overlap."""
        query = select(Subscription).where(
            Subscription.subscription_id == subscription_id
        )
        return self.db.scalars(query.with_for_update()).first()

    def has_active(self, user_id: int) -> bool:
        query = select(Subscription.subscription_id).where(
            Subscription.user_id == user_id,
            Subscription.status == SubscriptionStatus.ACTIVE,
        )
        return self.db.scalar(query.limit(1)) is not None

    def list_by_user(self, user_id: int) -> list[Subscription]:
        """Newest first, with items."""
        query = _with_details(
            select(Subscription)
            .where(Subscription.user_id == user_id)
            .order_by(Subscription.subscription_id.desc())
        )
        return list(self.db.scalars(query).unique())

    def order_counts(self, subscription_ids: Iterable[int]) -> dict[int, int]:
        """subscription_id → how many orders were created from it (0 if none)."""
        ids = list(subscription_ids)
        counts = dict.fromkeys(ids, 0)
        if ids:
            rows = self.db.execute(
                select(Order.subscription_id, func.count())
                .where(Order.subscription_id.in_(ids))
                .group_by(Order.subscription_id)
            ).all()
            counts.update({sub_id: count for sub_id, count in rows})
        return counts

    def list_admin(
        self, status: SubscriptionStatus | None
    ) -> list[AdminSubscriptionRow]:
        """Every subscription (newest first), optionally only one status."""
        query = (
            select(
                Subscription.subscription_id,
                User.username,
                Customer.name,
                Customer.phone,
                Subscription.plan,
                Subscription.start_date,
                Subscription.end_date,
                Subscription.status,
                Subscription.daily_total,
                _orders_created(),
            )
            .join(User, User.user_id == Subscription.user_id)
            .join(Customer, Customer.customer_id == Subscription.customer_id)
            .order_by(Subscription.subscription_id.desc())
        )
        if status is not None:
            query = query.where(Subscription.status == status)
        return [AdminSubscriptionRow(*row) for row in self.db.execute(query).all()]

    def complete_finished(self, today: date) -> int:
        """ACTIVE subscriptions whose last day is before `today` → COMPLETED.
        Returns how many changed."""
        result = self.db.execute(
            update(Subscription)
            .where(
                Subscription.status == SubscriptionStatus.ACTIVE,
                Subscription.end_date < today,
            )
            .values(status=SubscriptionStatus.COMPLETED)
            .execution_options(synchronize_session="fetch")
        )
        return result.rowcount or 0

    def due_on_for_update(self, day: date) -> list[Subscription]:
        """ACTIVE subscriptions that deliver on `day`, LOCKED, in id order (always the
        same order, so two runs at the same time cannot deadlock)."""
        query = (
            select(Subscription)
            .where(
                Subscription.status == SubscriptionStatus.ACTIVE,
                Subscription.start_date <= day,
                Subscription.end_date >= day,
            )
            .order_by(Subscription.subscription_id)
            .with_for_update(of=Subscription)
            .options(selectinload(Subscription.items))
        )
        return list(self.db.scalars(query))

    def ids_with_order_on(self, day: date) -> set[int]:
        """Subscriptions that already have their order for `day`."""
        query = select(Order.subscription_id).where(
            Order.delivery_date == day, Order.subscription_id.is_not(None)
        )
        return {sub_id for sub_id in self.db.scalars(query) if sub_id is not None}
