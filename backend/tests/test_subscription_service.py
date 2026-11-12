"""Subscription rules (#97), tested on the service with FIXED dates, so the results do not
depend on the day the tests run."""

from datetime import date, timedelta
from decimal import Decimal

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import (
    InvalidFieldError,
    ProductUnavailableError,
    SubscriptionAlreadyActiveError,
    SubscriptionNotActiveError,
)
from app.models import (
    Order,
    OrderStatus,
    Product,
    Subscription,
    SubscriptionPlan,
    SubscriptionStatus,
    User,
)
from app.schemas.subscription import SubscriptionCreate
from app.services import order_service
from app.services.subscription_service import (
    cancel_subscription,
    create_subscription,
    end_date_for,
    generate_orders_for,
    list_my_subscriptions,
)
from tests import factories

TODAY = date(2026, 11, 20)
TOMORROW = TODAY + timedelta(days=1)


def subscribe(
    db: Session,
    user: User,
    *lines: tuple[Product, int],
    plan: SubscriptionPlan = SubscriptionPlan.WEEK,
    start: date = TOMORROW,
    today: date = TODAY,
) -> Subscription:
    data = SubscriptionCreate.model_validate(
        {
            "plan": plan,
            "start_date": start,
            "customer": {"name": "Ravi Kumar", "phone": "9876543210"},
            "items": [{"product_id": p.product_id, "quantity": q} for p, q in lines],
        }
    )
    return create_subscription(db, data, user, today=today)


def orders_of(db: Session, subscription: Subscription) -> list[Order]:
    query = select(Order).where(Order.subscription_id == subscription.subscription_id)
    return list(db.scalars(query.order_by(Order.delivery_date)))


@pytest.fixture
def user(db_session: Session) -> User:
    return factories.make_user(db_session)


@pytest.fixture
def milk(db_session: Session) -> Product:
    return factories.make_product(db_session, price="60.00", stock_quantity=100)


# ---- subscribe ----


@pytest.mark.parametrize(
    ("plan", "days", "last_day"),
    [
        (SubscriptionPlan.WEEK, 7, date(2026, 11, 27)),
        (SubscriptionPlan.HALF_MONTH, 15, date(2026, 12, 5)),
        (SubscriptionPlan.MONTH, 30, date(2026, 12, 20)),
    ],
)
def test_plans_run_7_15_or_30_days_including_the_start_day(
    db_session: Session, user: User, milk: Product, plan, days, last_day
) -> None:
    subscription = subscribe(db_session, user, (milk, 2), plan=plan)

    assert (subscription.days, subscription.end_date) == (days, last_day)
    assert subscription.daily_total == Decimal("120.00")
    assert subscription.status == SubscriptionStatus.ACTIVE


def test_end_date_counts_the_first_day() -> None:
    assert end_date_for(date(2026, 11, 1), 7) == date(2026, 11, 7)


@pytest.mark.parametrize(
    "start", [TODAY, TODAY - timedelta(days=1), TODAY + timedelta(days=31)]
)
def test_start_must_be_tomorrow_up_to_30_days_ahead(
    db_session: Session, user: User, milk: Product, start: date
) -> None:
    with pytest.raises(InvalidFieldError) as error:
        subscribe(db_session, user, (milk, 1), start=start)
    assert error.value.details[0].field == "start_date"


def test_start_30_days_ahead_is_allowed(
    db_session: Session, user: User, milk: Product
) -> None:
    subscription = subscribe(
        db_session, user, (milk, 1), start=TODAY + timedelta(days=30)
    )
    assert subscription.start_date == TODAY + timedelta(days=30)


def test_only_one_active_subscription_per_user(
    db_session: Session, user: User, milk: Product
) -> None:
    subscribe(db_session, user, (milk, 1))

    with pytest.raises(SubscriptionAlreadyActiveError):
        subscribe(db_session, user, (milk, 2))


def test_a_new_subscription_is_allowed_after_cancelling(
    db_session: Session, user: User, milk: Product
) -> None:
    first = subscribe(db_session, user, (milk, 1))
    cancel_subscription(db_session, first.subscription_id, user, today=TODAY)

    second = subscribe(db_session, user, (milk, 2))

    assert second.status == SubscriptionStatus.ACTIVE


def test_a_finished_plan_does_not_block_a_new_one(
    db_session: Session, user: User, milk: Product
) -> None:
    first = subscribe(db_session, user, (milk, 1))  # 21st-27th Nov
    later = date(2026, 11, 28)

    second = subscribe(
        db_session, user, (milk, 1), today=later, start=later + timedelta(days=1)
    )

    db_session.refresh(first)
    assert first.status == SubscriptionStatus.COMPLETED
    assert second.status == SubscriptionStatus.ACTIVE


def test_unavailable_product_is_refused_and_nothing_is_saved(
    db_session: Session, user: User
) -> None:
    hidden = factories.make_product(db_session, is_available=False)
    db_session.commit()  # keep the test data when the service rolls back

    with pytest.raises(ProductUnavailableError):
        subscribe(db_session, user, (hidden, 1))
    assert db_session.scalar(select(Subscription)) is None


def test_the_database_refuses_a_second_active_subscription(
    db_session: Session, user: User, milk: Product
) -> None:
    """Even if the service check were skipped (two requests at the same moment)."""
    first = subscribe(db_session, user, (milk, 1))
    copy = Subscription(
        user_id=user.user_id,
        customer_id=first.customer_id,
        plan=SubscriptionPlan.WEEK,
        start_date=TOMORROW,
        end_date=TOMORROW,
        status=SubscriptionStatus.ACTIVE,
        daily_total=Decimal("1.00"),
    )
    with pytest.raises(IntegrityError), db_session.begin_nested():
        db_session.add(copy)
        db_session.flush()


# ---- cancel ----


def test_cancel_sets_status_and_time(
    db_session: Session, user: User, milk: Product
) -> None:
    subscription = subscribe(db_session, user, (milk, 1))

    cancelled = cancel_subscription(
        db_session, subscription.subscription_id, user, today=TODAY
    )

    assert cancelled.status == SubscriptionStatus.CANCELLED
    assert cancelled.cancelled_at is not None


def test_cancelling_twice_is_refused(
    db_session: Session, user: User, milk: Product
) -> None:
    subscription = subscribe(db_session, user, (milk, 1))
    cancel_subscription(db_session, subscription.subscription_id, user, today=TODAY)

    with pytest.raises(SubscriptionNotActiveError, match="already cancelled"):
        cancel_subscription(db_session, subscription.subscription_id, user, today=TODAY)


def test_a_completed_plan_cannot_be_cancelled(
    db_session: Session, user: User, milk: Product
) -> None:
    subscription = subscribe(db_session, user, (milk, 1))

    with pytest.raises(SubscriptionNotActiveError, match="already completed"):
        cancel_subscription(
            db_session, subscription.subscription_id, user, today=date(2026, 12, 1)
        )


def test_my_list_shows_finished_plans_as_completed(
    db_session: Session, user: User, milk: Product
) -> None:
    subscribe(db_session, user, (milk, 1))

    [(subscription, count)] = list_my_subscriptions(
        db_session, user, today=date(2026, 12, 1)
    )

    assert (subscription.status, count) == (SubscriptionStatus.COMPLETED, 0)


# ---- generate the daily orders ----


def test_generate_creates_one_order_with_the_locked_price(
    db_session: Session, user: User, milk: Product
) -> None:
    subscription = subscribe(db_session, user, (milk, 2))
    milk.price = Decimal("75.00")  # price goes up after subscribing
    db_session.commit()

    result = generate_orders_for(db_session, TOMORROW)

    [order] = orders_of(db_session, subscription)
    assert result.created == [(subscription.subscription_id, order.order_id)]
    assert (order.delivery_date, order.status) == (TOMORROW, OrderStatus.PLACED)
    assert order.user_id == user.user_id
    assert order.items[0].unit_price == Decimal("60.00")  # locked, not 75.00
    assert order.total_amount == Decimal("120.00")
    db_session.refresh(milk)
    assert milk.stock_quantity == 98  # stock reduced like a normal order


def test_generate_twice_never_duplicates(
    db_session: Session, user: User, milk: Product
) -> None:
    subscription = subscribe(db_session, user, (milk, 1))
    generate_orders_for(db_session, TOMORROW)

    again = generate_orders_for(db_session, TOMORROW)

    assert (again.created, again.already_created) == ([], 1)
    assert len(orders_of(db_session, subscription)) == 1


def test_one_order_per_day_over_the_plan(
    db_session: Session, user: User, milk: Product
) -> None:
    subscription = subscribe(db_session, user, (milk, 1))  # 21st-27th Nov

    for offset in range(-1, 9):  # 20th Nov to 29th Nov
        generate_orders_for(db_session, TOMORROW + timedelta(days=offset))

    days = [order.delivery_date for order in orders_of(db_session, subscription)]
    assert days == [TOMORROW + timedelta(days=n) for n in range(7)]
    db_session.refresh(subscription)
    assert subscription.status == SubscriptionStatus.COMPLETED


def test_cancelled_subscription_gets_no_more_orders(
    db_session: Session, user: User, milk: Product
) -> None:
    subscription = subscribe(db_session, user, (milk, 1))
    generate_orders_for(db_session, TOMORROW)
    cancel_subscription(db_session, subscription.subscription_id, user, today=TOMORROW)

    result = generate_orders_for(db_session, TOMORROW + timedelta(days=1))

    assert result.created == []
    [kept] = orders_of(db_session, subscription)  # the order already made stays
    assert kept.status == OrderStatus.PLACED


def test_a_day_without_stock_is_skipped_and_the_plan_goes_on(
    db_session: Session, user: User
) -> None:
    low = factories.make_product(db_session, stock_quantity=3)
    subscription = subscribe(db_session, user, (low, 2))

    first = generate_orders_for(db_session, TOMORROW)  # 3 → 1
    second = generate_orders_for(db_session, TOMORROW + timedelta(days=1))

    assert len(first.created) == 1
    assert second.skipped == [
        (subscription.subscription_id, f"Not enough stock of '{low.name} {low.size}'.")
    ]
    db_session.refresh(subscription)
    db_session.refresh(low)
    assert (subscription.status, low.stock_quantity) == (SubscriptionStatus.ACTIVE, 1)


def test_one_skipped_subscription_does_not_stop_the_others(
    db_session: Session, milk: Product
) -> None:
    hidden_later = factories.make_product(db_session)
    first_user, second_user = (
        factories.make_user(db_session),
        factories.make_user(db_session),
    )
    skipped = subscribe(db_session, first_user, (hidden_later, 1))
    served = subscribe(db_session, second_user, (milk, 1))
    hidden_later.is_available = False
    db_session.commit()

    result = generate_orders_for(db_session, TOMORROW)

    assert [s for s, _ in result.skipped] == [skipped.subscription_id]
    assert [s for s, _ in result.created] == [served.subscription_id]


def test_cancelling_a_subscription_order_restores_stock(
    db_session: Session, user: User, milk: Product
) -> None:
    subscribe(db_session, user, (milk, 4))
    [(_, order_id)] = generate_orders_for(db_session, TOMORROW).created

    order_service.update_status(db_session, order_id, OrderStatus.CANCELLED)

    db_session.refresh(milk)
    assert milk.stock_quantity == 100


def test_the_database_refuses_two_orders_for_the_same_day(
    db_session: Session, user: User, milk: Product
) -> None:
    subscription = subscribe(db_session, user, (milk, 1))
    generate_orders_for(db_session, TOMORROW)
    duplicate = factories.make_order(db_session)

    with pytest.raises(IntegrityError), db_session.begin_nested():
        duplicate.subscription_id = subscription.subscription_id
        duplicate.delivery_date = TOMORROW
        db_session.flush()
