"""Admin daily deliveries (#101): what has to be delivered on one day, and its status.

A day's deliveries are:
- subscription orders FOR that day (orders.delivery_date), and
- one-time orders PLACED that day, India time (orders.order_date is stored in UTC, so
  the India day is turned into a UTC range: 00:00 IST = 18:30 UTC the day before).

Rows are sorted by delivery time (the subscription slot's start; one-time orders, which
have no slot, come last), then by customer name and order id.

#103: each order gets the ACTIVE delivery boy who covers its PIN code (looked up now,
not stored on the order), or none ("Not assigned"). `boy` filters the day to one
delivery boy (or the unassigned orders); the status counts and the "to load" product
totals then describe only those orders, while `boy_counts` always covers the whole day.
"""

from datetime import date, datetime, time, timedelta
from typing import Literal

from sqlalchemy.orm import Session

from app.models import DeliveryBoy, Order, OrderStatus
from app.repositories.delivery_boy_repository import DeliveryBoyRepository
from app.repositories.order_repository import OrderRepository
from app.schemas.delivery import (
    AssignedBoy,
    BoyCount,
    DayDeliveries,
    DeliveryItem,
    DeliveryRow,
    ProductTotal,
)
from app.services.subscription_service import IST

# The `boy` filter: a delivery boy's id, or "unassigned", or None (everything).
BoyFilter = int | Literal["unassigned"] | None


def india_day_range(day: date) -> tuple[datetime, datetime]:
    """[midnight, next midnight) of `day` in India, as time-zone-aware datetimes."""
    starts = datetime.combine(day, time(0, 0), tzinfo=IST)
    return starts, starts + timedelta(days=1)


def _row(order: Order, username: str | None, boy: DeliveryBoy | None) -> DeliveryRow:
    return DeliveryRow(
        order_id=order.order_id,
        user_id=order.user_id,
        username=username,
        customer_name=order.customer.name,
        customer_phone=order.customer.phone,
        subscription_id=order.subscription_id,
        delivery_slot=order.delivery_slot,
        delivery_pincode=order.delivery_pincode,
        delivery_boy=(
            AssignedBoy(
                delivery_boy_id=boy.delivery_boy_id, name=boy.name, phone=boy.phone
            )
            if boy
            else None
        ),
        status=order.status,
        total_amount=order.total_amount,
        items=[
            DeliveryItem(
                product_id=item.product_id,
                product_name=item.product.name,
                size=item.product.size,
                quantity=item.quantity,
            )
            for item in sorted(order.items, key=lambda i: i.order_item_id)
        ],
    )


def deliveries_for(db: Session, day: date, boy: BoyFilter = None) -> DayDeliveries:
    starts, ends = india_day_range(day)
    rows = OrderRepository(db).list_for_day(day, starts, ends)
    allocation = DeliveryBoyRepository(db).active_allocation()

    # Sort: slot start time (one-time orders last), customer name, order id.
    last = time(23, 59, 59)
    rows.sort(
        key=lambda row: (
            row[2] is None,
            row[2] or last,
            row[0].customer.name.lower(),
            row[0].order_id,
        )
    )

    # Who delivers each order (by PIN code), and the per-boy counts for the whole day.
    assigned = [
        (order, username, allocation.get(order.delivery_pincode or ""))
        for order, username, _ in rows
    ]
    per_boy: dict[int, BoyCount] = {}
    unassigned = 0
    for _, _, who in assigned:
        if who is None:
            unassigned += 1
            continue
        per_boy.setdefault(
            who.delivery_boy_id,
            BoyCount(delivery_boy_id=who.delivery_boy_id, name=who.name, orders=0),
        ).orders += 1

    if boy == "unassigned":
        assigned = [row for row in assigned if row[2] is None]
    elif boy is not None:
        assigned = [row for row in assigned if row[2] and row[2].delivery_boy_id == boy]

    counts: dict[OrderStatus, int] = dict.fromkeys(OrderStatus, 0)
    totals: dict[int, ProductTotal] = {}
    for order, _, _ in assigned:
        counts[order.status] += 1
        if order.status == OrderStatus.CANCELLED:
            continue  # nothing to load on the van
        for item in order.items:
            total = totals.setdefault(
                item.product_id,
                ProductTotal(
                    product_id=item.product_id,
                    product_name=item.product.name,
                    size=item.product.size,
                    quantity=0,
                ),
            )
            total.quantity += item.quantity

    return DayDeliveries(
        date=day,
        status_counts=counts,
        product_totals=sorted(
            totals.values(), key=lambda t: (t.product_name.lower(), t.size)
        ),
        boy_counts=sorted(per_boy.values(), key=lambda c: c.name.lower()),
        unassigned_count=unassigned,
        deliveries=[_row(order, username, who) for order, username, who in assigned],
    )


def todays_orders_per_boy(db: Session, today: date) -> dict[int, int]:
    """#103: delivery boy id → today's orders in his areas (not cancelled)."""
    starts, ends = india_day_range(today)
    allocation = DeliveryBoyRepository(db).active_allocation()
    counts: dict[int, int] = {}
    for order, _, _ in OrderRepository(db).list_for_day(today, starts, ends):
        who = allocation.get(order.delivery_pincode or "")
        if who is not None and order.status != OrderStatus.CANCELLED:
            counts[who.delivery_boy_id] = counts.get(who.delivery_boy_id, 0) + 1
    return counts
