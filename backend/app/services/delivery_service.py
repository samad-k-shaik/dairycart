"""Today's orders per delivery boy, for the Delivery boys tab (#103).

#101 had the whole Deliveries page here; #104 moved the day view into the admin Orders
board (OrderRepository.list_admin with AdminOrderFilters). An order belongs to the
ACTIVE delivery boy covering its PIN code, looked up when read.
"""

from datetime import date, time

from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.core.india_time import india_day_range
from app.models import DeliveryBoy, Order, OrderStatus
from app.repositories.delivery_boy_repository import DeliveryBoyRepository
from app.repositories.order_repository import OrderRepository
from app.services import order_service


def todays_orders_per_boy(db: Session, today: date) -> dict[int, int]:
    """Delivery boy id → that day's orders in his areas (not cancelled)."""
    starts, ends = india_day_range(today)
    allocation = DeliveryBoyRepository(db).active_allocation()
    counts: dict[int, int] = {}
    for order, _, _ in OrderRepository(db).list_for_day(today, starts, ends):
        who = allocation.get(order.delivery_pincode or "")
        if who is not None and order.status != OrderStatus.CANCELLED:
            counts[who.delivery_boy_id] = counts.get(who.delivery_boy_id, 0) + 1
    return counts


# ---- The delivery boy's own pages (#109) ----


def my_orders(db: Session, boy: DeliveryBoy, day: date) -> list[Order]:
    """The orders to deliver on `day` in the delivery boy's areas (PIN codes), not cancelled.

    Same day rule as the admin Orders board (OrderRepository.list_for_day). Sorted by the
    subscription slot time (one-time orders, which have no slot, last), then order number."""
    pincodes = {area.pincode for area in boy.areas}
    starts, ends = india_day_range(day)
    rows = OrderRepository(db).list_for_day(day, starts, ends)
    mine = [
        (order, start)
        for order, _, start in rows
        if order.delivery_pincode in pincodes and order.status != OrderStatus.CANCELLED
    ]
    mine.sort(key=lambda pair: (pair[1] is None, pair[1] or time.min, pair[0].order_id))
    return [order for order, _ in mine]


def update_my_order_status(
    db: Session, boy: DeliveryBoy, order_id: int, new_status: OrderStatus
) -> Order:
    """Mark one of HIS orders out for delivery or delivered.

    An order outside his areas answers 404, like a missing one (he must not learn about
    other areas' orders). The normal transition rules apply (order_service.update_status),
    so CONFIRMED → OUT_FOR_DELIVERY → DELIVERED; anything else is a 409."""
    order = OrderRepository(db).get_with_items(order_id)
    pincodes = {area.pincode for area in boy.areas}
    if order is None or order.delivery_pincode not in pincodes:
        raise NotFoundError(f"Order {order_id} was not found.")
    return order_service.update_status(db, order_id, new_status)
