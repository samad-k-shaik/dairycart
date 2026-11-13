"""Admin daily deliveries (#101): which orders belong to a day (India time), the sorting,
product totals and status counts. Fixed dates, so results do not depend on today."""

from datetime import UTC, date, datetime, time, timedelta

import pytest
from sqlalchemy.orm import Session

from app.models import Order, OrderStatus, Product, SubscriptionPlan, User
from app.schemas.subscription import SubscriptionCreate
from app.services.delivery_service import deliveries_for, india_day_range
from app.services.subscription_service import create_subscription, generate_orders_for
from tests import factories

DAY = date(2026, 11, 21)


def one_time_order(
    db: Session,
    placed_at: datetime,
    *lines: tuple[Product, int],
    user: User | None = None,
) -> Order:
    order = factories.make_order(db, items=list(lines), user=user)
    order.order_date = placed_at
    db.flush()
    return order


def subscription_order(
    db: Session, user: User, product: Product, quantity: int, slot_start: time | None
) -> Order:
    """A subscription starting on DAY (subscribed the day before), and its order."""
    slot = (
        factories.make_slot(db, start=slot_start, minutes=30)
        if slot_start
        else factories.standard_slot(db)
    )
    data = SubscriptionCreate.model_validate(
        {
            "plan": SubscriptionPlan.WEEK,
            "start_date": DAY,
            "delivery_slot_id": slot.delivery_slot_id,
            "customer": {
                "name": user.full_name,
                "phone": f"98{user.user_id:08d}"[-10:],
            },
            "items": [{"product_id": product.product_id, "quantity": quantity}],
        }
    )
    subscription = create_subscription(db, data, user, today=DAY - timedelta(days=1))
    result = generate_orders_for(db, DAY)
    [order_id] = [o for s, o in result.created if s == subscription.subscription_id]
    order = db.get(Order, order_id)
    assert order is not None
    return order


@pytest.fixture
def milk(db_session: Session) -> Product:
    return factories.make_product(db_session, name="Cow Milk", price="60.00")


@pytest.fixture
def paneer(db_session: Session) -> Product:
    return factories.make_product(
        db_session, name="Paneer", size="200 g", price="90.00"
    )


def ids(day: date, db: Session) -> list[int]:
    return [row.order_id for row in deliveries_for(db, day).deliveries]


def test_india_day_starts_at_1830_utc_the_day_before() -> None:
    starts, ends = india_day_range(DAY)
    assert starts.astimezone(UTC) == datetime(2026, 11, 20, 18, 30, tzinfo=UTC)
    assert ends - starts == timedelta(days=1)


def test_one_time_orders_count_on_the_india_day_they_were_placed(
    db_session: Session, milk: Product
) -> None:
    # 23:59 IST on the 20th → not the 21st; 00:00 IST on the 21st → yes;
    # 23:59 IST on the 21st → yes; 00:00 IST on the 22nd → no.
    before = one_time_order(
        db_session, datetime(2026, 11, 20, 18, 29, tzinfo=UTC), (milk, 1)
    )
    first = one_time_order(
        db_session, datetime(2026, 11, 20, 18, 30, tzinfo=UTC), (milk, 1)
    )
    last = one_time_order(
        db_session, datetime(2026, 11, 21, 18, 29, tzinfo=UTC), (milk, 1)
    )
    after = one_time_order(
        db_session, datetime(2026, 11, 21, 18, 30, tzinfo=UTC), (milk, 1)
    )

    day_ids = ids(DAY, db_session)

    assert first.order_id in day_ids and last.order_id in day_ids
    assert before.order_id not in day_ids and after.order_id not in day_ids


def test_subscription_orders_count_on_their_delivery_date(
    db_session: Session, milk: Product
) -> None:
    user = factories.make_user(db_session, full_name="Ravi Kumar")
    order = subscription_order(db_session, user, milk, 2, None)

    assert order.order_id in ids(DAY, db_session)
    assert order.order_id not in ids(DAY + timedelta(days=1), db_session)


def test_rows_sorted_by_delivery_time_then_name_one_time_last(
    db_session: Session, milk: Product
) -> None:
    late = subscription_order(
        db_session,
        factories.make_user(db_session, full_name="Anil"),
        milk,
        1,
        time(19, 0),
    )
    early = subscription_order(
        db_session,
        factories.make_user(db_session, full_name="Zara"),
        milk,
        1,
        time(6, 0),
    )
    walk_in = one_time_order(
        db_session, datetime(2026, 11, 21, 3, 0, tzinfo=UTC), (milk, 1)
    )

    day_ids = ids(DAY, db_session)
    mine = [
        i for i in day_ids if i in {late.order_id, early.order_id, walk_in.order_id}
    ]

    assert mine == [early.order_id, late.order_id, walk_in.order_id]


def test_row_shape_and_slot(db_session: Session, milk: Product) -> None:
    user = factories.make_user(db_session, full_name="Ravi Kumar")
    order = subscription_order(db_session, user, milk, 2, None)

    row = next(
        r
        for r in deliveries_for(db_session, DAY).deliveries
        if r.order_id == order.order_id
    )

    assert (row.username, row.user_id) == (user.username, user.user_id)
    assert row.subscription_id == order.subscription_id
    assert row.delivery_slot == "Morning, 8:00 AM – 9:00 AM"
    assert [(i.product_name, i.quantity) for i in row.items] == [("Cow Milk", 2)]
    assert row.status == OrderStatus.PLACED


def test_product_totals_and_status_counts_skip_nothing_but_cancelled_totals(
    db_session: Session, milk: Product, paneer: Product
) -> None:
    noon = datetime(2026, 11, 21, 6, 30, tzinfo=UTC)
    one_time_order(db_session, noon, (milk, 2), (paneer, 1))
    one_time_order(db_session, noon, (milk, 3))
    cancelled = one_time_order(db_session, noon, (milk, 10))
    cancelled.status = OrderStatus.CANCELLED
    db_session.flush()

    day = deliveries_for(db_session, DAY)

    totals = {(t.product_name, t.size): t.quantity for t in day.product_totals}
    assert totals[("Cow Milk", "1 Litre")] == 5  # the cancelled 10 are not loaded
    assert totals[("Paneer", "200 g")] == 1
    assert day.status_counts[OrderStatus.PLACED] >= 2
    assert day.status_counts[OrderStatus.CANCELLED] >= 1
    assert set(day.status_counts) == set(OrderStatus)


def test_an_empty_day(db_session: Session) -> None:
    day = deliveries_for(db_session, date(2001, 1, 1))
    assert (day.deliveries, day.product_totals) == ([], [])
    assert all(count == 0 for count in day.status_counts.values())
