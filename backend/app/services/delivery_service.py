"""Admin daily deliveries (#101): what has to be delivered on one day, and its status.

A day's deliveries are:
- subscription orders FOR that day (orders.delivery_date), and
- one-time orders PLACED that day, India time (orders.order_date is stored in UTC, so
  the India day is turned into a UTC range: 00:00 IST = 18:30 UTC the day before).

Rows are sorted by delivery time (the subscription slot's start; one-time orders, which
have no slot, come last), then by customer name and order id.
"""

from datetime import date, datetime, time, timedelta

from sqlalchemy.orm import Session

from app.models import Order, OrderStatus
from app.repositories.order_repository import OrderRepository
from app.schemas.delivery import DayDeliveries, DeliveryItem, DeliveryRow, ProductTotal
from app.services.subscription_service import IST


def india_day_range(day: date) -> tuple[datetime, datetime]:
    """[midnight, next midnight) of `day` in India, as time-zone-aware datetimes."""
    starts = datetime.combine(day, time(0, 0), tzinfo=IST)
    return starts, starts + timedelta(days=1)


def _row(order: Order, username: str | None) -> DeliveryRow:
    return DeliveryRow(
        order_id=order.order_id,
        user_id=order.user_id,
        username=username,
        customer_name=order.customer.name,
        customer_phone=order.customer.phone,
        subscription_id=order.subscription_id,
        delivery_slot=order.delivery_slot,
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


def deliveries_for(db: Session, day: date) -> DayDeliveries:
    starts, ends = india_day_range(day)
    rows = OrderRepository(db).list_for_day(day, starts, ends)

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

    counts: dict[OrderStatus, int] = dict.fromkeys(OrderStatus, 0)
    totals: dict[int, ProductTotal] = {}
    for order, _, _ in rows:
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
        deliveries=[_row(order, username) for order, username, _ in rows],
    )
