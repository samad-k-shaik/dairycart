"""Admin Orders board (#104, was the #101 Deliveries page): which orders belong to an
India day, search, status counts and newest-first order. Fixed dates, so the results do
not depend on the day the tests run."""

from datetime import UTC, date, datetime, timedelta

import pytest
from sqlalchemy.orm import Session

from app.core.india_time import india_day_range
from app.models import Order, OrderStatus, Product, SubscriptionPlan, User
from app.repositories.order_repository import AdminOrderFilters
from app.schemas.subscription import SubscriptionCreate
from app.services import order_service
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


def subscription_order(db: Session, user: User, product: Product) -> Order:
    """A subscription starting on DAY (subscribed the day before), and its order."""
    data = SubscriptionCreate.model_validate(
        {
            "plan": SubscriptionPlan.WEEK,
            "start_date": DAY,
            "delivery_slot_id": factories.standard_slot(db).delivery_slot_id,
            "customer": {
                "name": user.full_name,
                "phone": f"98{user.user_id:08d}"[-10:],
            },
            "items": [{"product_id": product.product_id, "quantity": 2}],
        }
    )
    subscription = create_subscription(db, data, user, today=DAY - timedelta(days=1))
    result = generate_orders_for(db, DAY)
    [order_id] = [o for s, o in result.created if s == subscription.subscription_id]
    order = db.get(Order, order_id)
    assert order is not None
    return order


def board(db: Session, **filters: object) -> order_service.AdminOrderBoard:
    return order_service.list_admin_orders(
        db, status=None, page=1, page_size=100, filters=AdminOrderFilters(**filters)
    )


def ids(db: Session, **filters: object) -> list[int]:
    return [order.order_id for order, _, _ in board(db, **filters).rows]


@pytest.fixture
def milk(db_session: Session) -> Product:
    return factories.make_product(db_session, name="Cow Milk", price="60.00")


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

    day_ids = ids(db_session, day=DAY)

    assert first.order_id in day_ids and last.order_id in day_ids
    assert before.order_id not in day_ids and after.order_id not in day_ids
    # Without a day: every order.
    assert {before.order_id, after.order_id} <= set(ids(db_session))


def test_subscription_orders_count_on_their_delivery_date(
    db_session: Session, milk: Product
) -> None:
    user = factories.make_user(db_session, full_name="Ravi Kumar")
    order = subscription_order(db_session, user, milk)

    assert order.order_id in ids(db_session, day=DAY)
    assert order.order_id not in ids(db_session, day=DAY + timedelta(days=1))


def test_newest_first(db_session: Session, milk: Product) -> None:
    older = one_time_order(
        db_session, datetime(2026, 11, 21, 3, 0, tzinfo=UTC), (milk, 1)
    )
    newer = one_time_order(
        db_session, datetime(2026, 11, 21, 5, 0, tzinfo=UTC), (milk, 1)
    )

    mine = [
        i for i in ids(db_session, day=DAY) if i in {older.order_id, newer.order_id}
    ]

    assert mine == [newer.order_id, older.order_id]


def test_rows_have_username_and_items(db_session: Session, milk: Product) -> None:
    user = factories.make_user(db_session, full_name="Ravi Kumar")
    order = subscription_order(db_session, user, milk)

    [(row, username, boy)] = [
        r for r in board(db_session, day=DAY).rows if r[0] == order
    ]

    assert (username, boy) == (user.username, None)
    assert [(i.product.name, i.quantity) for i in row.items] == [("Cow Milk", 2)]


@pytest.mark.parametrize("query", ["Meena", "meena iy", "98765", "#{id}", "{id}"])
def test_search_by_name_phone_or_order_number(
    db_session: Session, milk: Product, query: str
) -> None:
    customer = factories.make_customer(
        db_session, name="Meena Iyer", phone="9876512399"
    )
    order = factories.make_order(db_session, customer=customer, items=[(milk, 1)])
    factories.make_order(db_session, items=[(milk, 1)])  # someone else

    found = ids(db_session, q=query.format(id=order.order_id))

    assert order.order_id in found
    if (
        query == "#{id}"
    ):  # "#42" means the order number only (a plain 42 may match phones)
        assert found == [order.order_id]


def test_status_counts_follow_the_filters_but_not_the_status(
    db_session: Session, milk: Product
) -> None:
    noon = datetime(2026, 11, 21, 6, 30, tzinfo=UTC)
    one_time_order(db_session, noon, (milk, 1))
    cancelled = one_time_order(db_session, noon, (milk, 1))
    cancelled.status = OrderStatus.CANCELLED
    db_session.flush()

    day = board(db_session, day=DAY)
    other_day = board(db_session, day=date(2001, 1, 1))

    assert (
        day.status_counts[OrderStatus.PLACED],
        day.status_counts[OrderStatus.CANCELLED],
    ) == (1, 1)
    assert set(day.status_counts) == set(OrderStatus)
    assert sum(other_day.status_counts.values()) == 0
    only_cancelled = order_service.list_admin_orders(
        db_session,
        status=OrderStatus.CANCELLED,
        page=1,
        page_size=100,
        filters=AdminOrderFilters(day=DAY),
    )
    assert [o.order_id for o, _, _ in only_cancelled.rows] == [cancelled.order_id]
    assert only_cancelled.status_counts == day.status_counts  # chips keep their counts


def test_an_empty_day(db_session: Session) -> None:
    empty = board(db_session, day=date(2001, 1, 1))
    assert (empty.rows, empty.total, empty.boy_counts, empty.unassigned_count) == (
        [],
        0,
        [],
        0,
    )
