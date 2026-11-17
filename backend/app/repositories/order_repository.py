"""Queries for orders and order items (M3-02).

Loading an order WITH its items, products and customer uses eager loading (a fixed
number of queries), not "N+1": without it, reading order.items[i].product would run one
extra query per item.
"""

from dataclasses import dataclass
from datetime import date, datetime, time
from decimal import Decimal
from typing import Literal

from sqlalchemy import ColumnElement, Select, and_, func, or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.core.india_time import india_day_range
from app.models import (
    Customer,
    DeliveryArea,
    DeliveryBoy,
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


@dataclass(frozen=True)
class AdminOrderFilters:
    """#104: the admin Orders board filters (all optional).

    day  → the India delivery day: subscription orders FOR that day (delivery_date) +
           one-time orders PLACED that day (order_date between India midnights)
    boy  → a delivery boy's id (orders in his areas) or "unassigned"
    q    → search: customer name or phone (contains), or the order number
    """

    day: date | None = None
    boy: int | Literal["unassigned"] | None = None
    q: str | None = None


def _active_areas():
    """PIN codes of ACTIVE delivery boys, with the delivery boy's id (#103)."""
    return (
        select(DeliveryArea.pincode, DeliveryArea.delivery_boy_id)
        .join(DeliveryBoy, DeliveryBoy.delivery_boy_id == DeliveryArea.delivery_boy_id)
        .where(DeliveryBoy.is_active.is_(True))
        .subquery()
    )


def _day_condition(day: date) -> ColumnElement[bool]:
    starts, ends = india_day_range(day)
    return or_(
        and_(Order.subscription_id.is_not(None), Order.delivery_date == day),
        and_(
            Order.subscription_id.is_(None),
            Order.order_date >= starts,
            Order.order_date < ends,
        ),
    )


def _search_condition(q: str) -> ColumnElement[bool]:
    """Name or phone contains `q`; "42" or "#42" also matches order 42."""
    text = q.strip()
    conditions: list[ColumnElement[bool]] = [
        Customer.name.ilike(f"%{text}%"),
        Customer.phone.contains(text),
    ]
    number = text.removeprefix("#")
    if number.isdigit() and len(number) <= 9:
        conditions.append(Order.order_id == int(number))
    return or_(*conditions)


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

    def _admin_query(self, filters: AdminOrderFilters, *, use_boy: bool = True) -> Select:
        """SELECT orders JOIN customers with the board filters (not the status)."""
        query = select(Order).join(Order.customer)
        if filters.day is not None:
            query = query.where(_day_condition(filters.day))
        if filters.q:
            query = query.where(_search_condition(filters.q))
        if use_boy and filters.boy is not None:
            areas = _active_areas()
            if filters.boy == "unassigned":
                query = query.where(
                    or_(
                        Order.delivery_pincode.is_(None),
                        Order.delivery_pincode.not_in(select(areas.c.pincode)),
                    )
                )
            else:
                query = query.where(
                    Order.delivery_pincode.in_(
                        select(areas.c.pincode).where(areas.c.delivery_boy_id == filters.boy)
                    )
                )
        return query

    def list_admin(
        self,
        status: OrderStatus | None,
        page: int,
        page_size: int,
        filters: AdminOrderFilters | None = None,
    ) -> tuple[list[tuple[Order, str | None]], int]:
        """One page of orders (newest first) with customer, items and products loaded
        eagerly, each with the account holder's full name (#121); plus how many match in total."""
        query = self._admin_query(filters or AdminOrderFilters())
        if status is not None:
            query = query.where(Order.status == status)

        total = self.db.scalar(select(func.count()).select_from(query.order_by(None).subquery()))
        page_query = _with_details(
            query.add_columns(User.full_name)
            .outerjoin(User, User.user_id == Order.user_id)
            .order_by(Order.order_date.desc(), Order.order_id.desc())
            .limit(page_size)
            .offset((page - 1) * page_size)
        )
        rows = self.db.execute(page_query).unique().all()
        return [(order, account_name) for order, account_name in rows], total or 0

    def boy_counts(self, filters: AdminOrderFilters) -> tuple[dict[int, int], int]:
        """#104: orders per active delivery boy (by PIN code) and the unassigned ones,
        for the board filters except `boy` itself and the status."""
        areas = _active_areas()
        base = self._admin_query(filters, use_boy=False).subquery()
        rows = self.db.execute(
            select(areas.c.delivery_boy_id, func.count())
            .select_from(base)
            .outerjoin(areas, areas.c.pincode == base.c.delivery_pincode)
            .group_by(areas.c.delivery_boy_id)
        ).all()
        per_boy = {boy_id: count for boy_id, count in rows if boy_id is not None}
        unassigned = next((count for boy_id, count in rows if boy_id is None), 0)
        return per_boy, unassigned

    def list_for_day(
        self, day: date, starts: datetime, ends: datetime
    ) -> list[tuple[Order, str | None, time | None]]:
        """#101: the orders to deliver on `day`, each with the account holder's name and
        the subscription slot's start time (for sorting; None for one-time orders).

        A day = subscription orders FOR that day (delivery_date) + one-time orders
        PLACED in [starts, ends) (the day's midnight-to-midnight in India time, in UTC).
        Customer, items and products are loaded eagerly (no N+1)."""
        query = _with_details(
            select(Order, User.full_name, DeliverySlot.start_time)
            .outerjoin(User, User.user_id == Order.user_id)
            .outerjoin(Subscription, Subscription.subscription_id == Order.subscription_id)
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
        return [(order, account_name, start) for order, account_name, start in rows]

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

    def count_by_status(self, filters: AdminOrderFilters | None = None) -> dict[OrderStatus, int]:
        """How many orders have each status; statuses with no orders get 0.
        #104: only the orders matching the board filters (all orders without them)."""
        counts: dict[OrderStatus, int] = dict.fromkeys(OrderStatus, 0)
        base = self._admin_query(filters or AdminOrderFilters()).subquery()
        rows = self.db.execute(select(base.c.status, func.count()).group_by(base.c.status)).all()
        for status, count in rows:
            counts[OrderStatus(status)] = count
        return counts
