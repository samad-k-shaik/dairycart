"""Live tracking (#110, ADR-018): delivery rounds and the delivery boy's latest position.

Write path of live tracking (#110):
    phone (browser GPS) ──PUT /delivery/me/location every 10–15 s──► save_location ──► upsert

Privacy rules (NFR-17):
- A position is accepted ONLY while he is on a round (he pressed "Start round", which shows
  the consent text). Otherwise 409 ROUND_NOT_STARTED and nothing is stored.
- "Stop round" deletes his position. There is no history.
- Coordinates are never logged (the request log has the path only).

Read path: live_map() for the admin (#111), track_order() for the customer (#112).
"""

from datetime import UTC, date, datetime, timedelta

from sqlalchemy.orm import Session

from app.core.errors import RoundNotStartedError
from app.core.india_time import india_day_range
from app.models import DeliveryBoy, OrderStatus, User
from app.repositories.delivery_boy_repository import DeliveryBoyRepository
from app.repositories.delivery_location_repository import DeliveryLocationRepository
from app.repositories.live_update_repository import notify_change
from app.repositories.order_repository import OrderRepository
from app.schemas.delivery import (
    LiveBoyRead,
    LiveOrderPin,
    LivePosition,
    LocationUpdate,
    TrackingBoy,
    TrackingPoint,
    TrackingRead,
)
from app.services import geo, order_service

# A position older than this is shown greyed out ("stale") on the maps (#111, #112).
STALE_AFTER = timedelta(minutes=2)


def _now() -> datetime:
    return datetime.now(UTC)


def start_round(db: Session, boy: DeliveryBoy) -> DeliveryBoy:
    """Start sharing. Pressing it twice keeps the first start time."""
    try:
        if boy.round_started_at is None:
            boy.round_started_at = _now()
        notify_change(db)  # #113: live pages update at once
        db.commit()
    except Exception:
        db.rollback()
        raise
    return boy


def stop_round(db: Session, boy: DeliveryBoy) -> DeliveryBoy:
    """Stop sharing and forget where he is."""
    try:
        boy.round_started_at = None
        DeliveryLocationRepository(db).delete(boy.delivery_boy_id)
        notify_change(db)  # #113
        db.commit()
    except Exception:
        db.rollback()
        raise
    return boy


def save_location(
    db: Session, boy: DeliveryBoy, data: LocationUpdate, now: datetime | None = None
) -> bool:
    """Store his latest position. Returns False if it was older than the saved one (ignored).

    A phone clock that runs ahead is clamped to the server's time, so a wrong clock cannot
    block his later readings."""
    if boy.round_started_at is None:
        raise RoundNotStartedError(
            "Start your round first. Your location is only shared during a round."
        )
    recorded_at = min(data.recorded_at, now or _now())
    try:
        saved = DeliveryLocationRepository(db).upsert_if_newer(
            boy.delivery_boy_id, data.latitude, data.longitude, data.accuracy_m, recorded_at
        )
        if saved:
            notify_change(db)  # #113: only when the pin really moved
        db.commit()
    except Exception:
        db.rollback()
        raise
    return saved


def is_stale(updated_at: datetime, now: datetime | None = None) -> bool:
    """True when the last update is older than STALE_AFTER (the phone stopped sending:
    screen locked, no signal…)."""
    return (now or _now()) - updated_at > STALE_AFTER


# ---- Read path: the admin live map (#111) ----


def live_map(db: Session, day: date, now: datetime | None = None) -> list[LiveBoyRead]:
    """Every ACTIVE delivery boy with his latest position (if on a round) and the pins of his
    undelivered orders for `day`. A fixed number of queries, however many delivery boys:
    all positions in one query, the day's orders in one query, the allocation in one."""
    now = now or _now()
    boys = [boy for boy in DeliveryBoyRepository(db).list_all() if boy.is_active]
    positions = {row.delivery_boy_id: row for row in DeliveryLocationRepository(db).list_all()}
    allocation = DeliveryBoyRepository(db).active_allocation()  # PIN code → delivery boy

    starts, ends = india_day_range(day)
    pins: dict[int, list[LiveOrderPin]] = {}
    for order, _, _ in OrderRepository(db).list_for_day(day, starts, ends):
        boy = allocation.get(order.delivery_pincode or "")
        if (
            boy is None
            or order.status in (OrderStatus.CANCELLED, OrderStatus.DELIVERED)
            or order.delivery_latitude is None
            or order.delivery_longitude is None
        ):
            continue
        pins.setdefault(boy.delivery_boy_id, []).append(
            LiveOrderPin(
                order_id=order.order_id,
                status=order.status,
                customer_name=order.customer.name,
                latitude=order.delivery_latitude,
                longitude=order.delivery_longitude,
            )
        )

    result = []
    for boy in boys:
        on_round = boy.round_started_at is not None
        row = positions.get(boy.delivery_boy_id) if on_round else None
        result.append(
            LiveBoyRead(
                delivery_boy_id=boy.delivery_boy_id,
                name=boy.name,
                phone=boy.phone,
                on_round=on_round,
                round_started_at=boy.round_started_at,
                position=(
                    LivePosition(
                        latitude=row.latitude,
                        longitude=row.longitude,
                        accuracy_m=row.accuracy_m,
                        updated_at=row.updated_at,
                        is_stale=is_stale(row.updated_at, now),
                    )
                    if row is not None
                    else None
                ),
                orders=sorted(pins.get(boy.delivery_boy_id, []), key=lambda p: p.order_id),
            )
        )
    # On a round first, then by name.
    return sorted(result, key=lambda b: (not b.on_round, b.name.lower()))


# ---- Read path: the customer's order (#112) ----


def track_order(
    db: Session, order_id: int, user: User, now: datetime | None = None
) -> TrackingRead:
    """Where is my order? Visible to the order's OWNER (and admins), like the order itself:
    anyone else gets 404 (order_service.get_order_for).

    The delivery boy's position is shown ONLY while the order is OUT_FOR_DELIVERY and the
    delivery boy covering its PIN code is on a round with a position (privacy, NFR-17). In
    every other case the response has the status only."""
    order = order_service.get_order_for(db, order_id, user)
    destination = (
        TrackingPoint(latitude=order.delivery_latitude, longitude=order.delivery_longitude)
        if order.delivery_latitude is not None and order.delivery_longitude is not None
        else None
    )
    boy_view: TrackingBoy | None = None
    if order.status == OrderStatus.OUT_FOR_DELIVERY:
        boy = DeliveryBoyRepository(db).active_allocation().get(order.delivery_pincode or "")
        row = (
            DeliveryLocationRepository(db).get(boy.delivery_boy_id)
            if boy is not None and boy.round_started_at is not None
            else None
        )
        if boy is not None and row is not None:
            boy_view = TrackingBoy(
                name=boy.name.split()[0],  # first name only
                position=TrackingPoint(latitude=row.latitude, longitude=row.longitude),
                updated_at=row.updated_at,
                is_stale=is_stale(row.updated_at, now),
            )

    distance = eta = None
    if boy_view is not None and destination is not None:
        distance = round(
            geo.haversine_km(
                boy_view.position.latitude,
                boy_view.position.longitude,
                destination.latitude,
                destination.longitude,
            ),
            1,
        )
        eta = geo.eta_minutes(distance)
    return TrackingRead(
        order_id=order.order_id,
        status=order.status,
        delivery_boy=boy_view,
        destination=destination,
        distance_km=distance,
        eta_minutes=eta,
    )
