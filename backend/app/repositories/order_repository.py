"""Queries for orders and order items (M3-02).

Loading an order WITH its items, products and customer uses eager loading (a fixed
number of queries), not "N+1": without it, reading order.items[i].product would run one
extra query per item.
"""

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models import Customer, Order, OrderItem, OrderStatus


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
        )
        return [OrderRow(*row) for row in self.db.execute(columns).all()]

    def list_by_phone(self, phone: str) -> list[OrderRow]:
        """A customer's orders, newest first (same second → higher id first)."""
        query = (
            select(Order)
            .join(Order.customer)
            .where(Customer.phone == phone)
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

    def count_by_status(self) -> dict[OrderStatus, int]:
        """How many orders have each status; statuses with no orders get 0."""
        counts: dict[OrderStatus, int] = dict.fromkeys(OrderStatus, 0)
        rows = self.db.execute(
            select(Order.status, func.count()).group_by(Order.status)
        ).all()
        for status, count in rows:
            counts[OrderStatus(status)] = count
        return counts
