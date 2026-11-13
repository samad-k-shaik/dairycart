"""Queries for orders and order items (M3-02).

Loading an order WITH its items, products and customer uses eager loading (a fixed
number of queries), not "N+1": without it, reading order.items[i].product would run one
extra query per item.
"""

from dataclasses import dataclass
from datetime import date, datetime, time
from decimal import Decimal

from sqlalchemy import Select, and_, func, or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models import (
    Customer,
    DeliverySlot,
    Order,
    OrderItem,
    OrderStatus,
    Subscription,
    User,
)


@dataclass(frozen=True)
class OrderRow:
    """One order in a list: the order's own fields plus its customer and item count."""

    order_id: int
    customer_name: str
    customer_phone: str
    order_date: datetime
    status: OrderStatus
    total_amount: Decimal
    item_count: int
    subscription_id: int | None  # #97: set for orders created from a subscription
    delivery_slot: str | None  # #100: the delivery time of a subscription order


def _with_details(query: Select) -> Select:
    """Load customer (1 JOIN) and items + their products (1 extra query) eagerly."""
    return query.options(
        joinedload(Order.customer),
        selectinload(Order.items).joinedload(OrderItem.product),
    )


class OrderRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, order: Order) -> Order:
        self.db.add(order)
        self.db.flush()  # INSERT order + items now, so the ids are known
        return order

    def get_with_items(self, order_id: int) -> Order | None:
        """One order with customer, items and products, or None."""
        query = _with_details(select(Order).where(Order.order_id == order_id))
        return self.db.scalars(query).unique().first()

    def get_for_update(self, order_id: int) -> Order | None:
        """Like get_with_items, but LOCKS the order row until commit (SELECT ... FOR
        UPDATE), so two admins changing the same order's status cannot both win."""
        query = _with_details(
            select(Order).where(Order.order_id == order_id).with_for_update(of=Order)
        )
        return self.db.scalars(query).unique().first()

    def _rows(self, query: Select) -> list[OrderRow]:
        item_count = (
            select(func.count(OrderItem.order_item_id))
            .where(OrderItem.order_id == Order.order_id)
            .correlate(Order)
            .scalar_subquery()
        )
        columns = query.with_only_columns(
            Order.order_id,
            Customer.name,
            Customer.phone,
            Order.order_date,
            Order.status,
            Order.total_amount,
            item_count,
            Order.subscription_id,
            Order.delivery_slot,
        )
        return [OrderRow(*row) for row in self.db.execute(columns).all()]

    def list_by_user(self, user_id: int) -> list[OrderRow]:
        """The orders placed by this account, newest first (same second → higher id
        first). #90: replaces the old lookup by phone number."""
        query = (
            select(Order)
            .join(Order.customer)
            .where(Order.user_id == user_id)
            .order_by(Order.order_date.desc(), Order.order_id.desc())
        )
        return self._rows(query)

    def list_admin(
        self, status: OrderStatus | None, page: int, page_size: int
    ) -> tuple[list[OrderRow], int]:
        """One page of orders (newest first), optionally one status, plus the total
        number of orders matching the filter."""
        query = select(Order).join(Order.customer)
        if status is not None:
            query = query.where(Order.status == status)

        total = self.db.scalar(
            select(func.count()).select_from(query.order_by(None).subquery())
        )
        page_query = (
            query.order_by(Order.order_date.desc(), Order.order_id.desc())
            .limit(page_size)
            .offset((page - 1) * page_size)
        )
        return self._rows(page_query), total or 0

    def list_for_day(
        self, day: date, starts: datetime, ends: datetime
    ) -> list[tuple[Order, str | None, time | None]]:
        """#101: the orders to deliver on `day`, each with the account's username and
        the subscription slot's start time (for sorting; None for one-time orders).

        A day = subscription orders FOR that day (delivery_date) + one-time orders
        PLACED in [starts, ends) (the day's midnight-to-midnight in India time, in UTC).
        Customer, items and products are loaded eagerly (no N+1)."""
        query = _with_details(
            select(Order, User.username, DeliverySlot.start_time)
            .outerjoin(User, User.user_id == Order.user_id)
            .outerjoin(
                Subscription, Subscription.subscription_id == Order.subscription_id
            )
            .outerjoin(
                DeliverySlot,
                DeliverySlot.delivery_slot_id == Subscription.delivery_slot_id,
            )
            .where(
                or_(
                    and_(
                        Order.subscription_id.is_not(None),
                        Order.delivery_date == day,
                    ),
                    and_(
                        Order.subscription_id.is_(None),
                        Order.order_date >= starts,
                        Order.order_date < ends,
                    ),
                )
            )
        )
        rows = self.db.execute(query).unique().all()
        return [(order, username, start) for order, username, start in rows]

    def user_totals(self, user_id: int) -> tuple[int, Decimal]:
        """#101: (number of orders, amount of the orders that are not cancelled)."""
        spent = func.coalesce(
            func.sum(Order.total_amount).filter(Order.status != OrderStatus.CANCELLED),
            Decimal("0.00"),
        )
        count, total = self.db.execute(
            select(func.count(Order.order_id), spent).where(Order.user_id == user_id)
        ).one()
        return count, total

    def count_by_status(self) -> dict[OrderStatus, int]:
        """How many orders have each status; statuses with no orders get 0."""
        counts: dict[OrderStatus, int] = dict.fromkeys(OrderStatus, 0)
        rows = self.db.execute(
            select(Order.status, func.count()).group_by(Order.status)
        ).all()
        for status, count in rows:
            counts[OrderStatus(status)] = count
        return counts
