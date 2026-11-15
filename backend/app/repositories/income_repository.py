"""Grouped queries for the admin Income tab (#105). Read-only.

Every query works on a range of India "delivery days" [start, end] (both included):
- a subscription order counts on its delivery_date;
- a one-time order counts on the India day it was placed (order_date is UTC, so it is
  converted with PostgreSQL's own time zone data: timezone('Asia/Kolkata', order_date)).
That is the same day rule as the admin Orders board (#104).
"""

from collections.abc import Sequence
from datetime import date
from decimal import Decimal

from sqlalchemy import Date, Row, case, cast, func, select
from sqlalchemy.orm import Session

from app.models import (
    Customer,
    DeliveryArea,
    Order,
    OrderItem,
    OrderStatus,
    Product,
    Subscription,
    SubscriptionStatus,
)

# The order's delivery day (see the module docstring).
DELIVERY_DAY = case(
    (Order.subscription_id.is_not(None), Order.delivery_date),
    else_=cast(func.timezone("Asia/Kolkata", Order.order_date), Date),
)
IS_SUBSCRIPTION = Order.subscription_id.is_not(None)
PENDING = (OrderStatus.PLACED, OrderStatus.CONFIRMED, OrderStatus.OUT_FOR_DELIVERY)


def _in_range(start: date, end: date):
    return DELIVERY_DAY.between(start, end)


class IncomeRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def daily(self, start: date, end: date) -> Sequence[Row]:
        """(day, income, orders) for each day with DELIVERED orders."""
        day = DELIVERY_DAY.label("day")
        return self.db.execute(
            select(day, func.sum(Order.total_amount), func.count(Order.order_id))
            .where(Order.status == OrderStatus.DELIVERED, _in_range(start, end))
            .group_by(day)
            .order_by(day)
        ).all()

    def monthly(self, start: date, end: date) -> Sequence[Row]:
        """(first day of month, income, orders) of DELIVERED orders."""
        month = cast(func.date_trunc("month", DELIVERY_DAY), Date).label("month")
        return self.db.execute(
            select(month, func.sum(Order.total_amount), func.count(Order.order_id))
            .where(Order.status == OrderStatus.DELIVERED, _in_range(start, end))
            .group_by(month)
            .order_by(month)
        ).all()

    def by_type(self, start: date, end: date) -> Sequence[Row]:
        """(is_subscription, income, orders) of DELIVERED orders."""
        return self.db.execute(
            select(
                IS_SUBSCRIPTION,
                func.sum(Order.total_amount),
                func.count(Order.order_id),
            )
            .where(Order.status == OrderStatus.DELIVERED, _in_range(start, end))
            .group_by(IS_SUBSCRIPTION)
        ).all()

    def product_lines(self, start: date, end: date) -> Sequence[Row]:
        """(pincode, product_id, name, size, quantity, income) of DELIVERED orders:
        products per PIN code, so litres can be added up per product and per area."""
        return self.db.execute(
            select(
                Order.delivery_pincode,
                Product.product_id,
                Product.name,
                Product.size,
                func.sum(OrderItem.quantity),
                func.sum(OrderItem.subtotal),
            )
            .join(OrderItem, OrderItem.order_id == Order.order_id)
            .join(Product, Product.product_id == OrderItem.product_id)
            .where(Order.status == OrderStatus.DELIVERED, _in_range(start, end))
            .group_by(Order.delivery_pincode, Product.product_id, Product.name, Product.size)
        ).all()

    def by_area(self, start: date, end: date) -> Sequence[Row]:
        """(pincode, income, orders, customers) of DELIVERED orders per PIN code."""
        return self.db.execute(
            select(
                Order.delivery_pincode,
                func.sum(Order.total_amount),
                func.count(Order.order_id),
                func.count(func.distinct(Order.customer_id)),
            )
            .where(Order.status == OrderStatus.DELIVERED, _in_range(start, end))
            .group_by(Order.delivery_pincode)
        ).all()

    def pending(self, start: date, end: date) -> tuple[Decimal, int]:
        """Amount and number of orders not delivered yet (and not cancelled)."""
        total, count = self.db.execute(
            select(
                func.coalesce(func.sum(Order.total_amount), Decimal("0.00")),
                func.count(Order.order_id),
            ).where(Order.status.in_(PENDING), _in_range(start, end))
        ).one()
        return total, count

    def area_names(self) -> dict[str, str]:
        """PIN code → locality name given to a delivery boy area (#103), when there is one."""
        rows = self.db.execute(
            select(DeliveryArea.pincode, DeliveryArea.area_name).where(
                DeliveryArea.area_name.is_not(None)
            )
        ).all()
        return {pincode: name for pincode, name in rows}

    def active_subscriptions(self) -> int:
        return (
            self.db.scalar(
                select(func.count(Subscription.subscription_id)).where(
                    Subscription.status == SubscriptionStatus.ACTIVE
                )
            )
            or 0
        )

    def recent_delivered(self, start: date, end: date, limit: int) -> Sequence[Row]:
        """(order_id, day, customer name, is_subscription, total) newest first."""
        day = DELIVERY_DAY.label("day")
        return self.db.execute(
            select(Order.order_id, day, Customer.name, IS_SUBSCRIPTION, Order.total_amount)
            .join(Customer, Customer.customer_id == Order.customer_id)
            .where(Order.status == OrderStatus.DELIVERED, _in_range(start, end))
            .order_by(day.desc(), Order.order_id.desc())
            .limit(limit)
        ).all()
