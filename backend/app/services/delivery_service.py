"""Today's orders per delivery boy, for the Delivery boys tab (#103).

#101 had the whole Deliveries page here; #104 moved the day view into the admin Orders
board (OrderRepository.list_admin with AdminOrderFilters). An order belongs to the
ACTIVE delivery boy covering its PIN code, looked up when read.
"""

from datetime import date

from sqlalchemy.orm import Session

from app.core.india_time import india_day_range
from app.models import OrderStatus
from app.repositories.delivery_boy_repository import DeliveryBoyRepository
from app.repositories.order_repository import OrderRepository


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
