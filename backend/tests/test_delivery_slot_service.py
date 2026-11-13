"""Delivery slot rules (#100), tested on the services with fixed dates."""

from datetime import date, time, timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import (
    DeliverySlotAlreadyExistsError,
    DeliverySlotFullError,
    DeliverySlotInUseError,
    InvalidFieldError,
    LastActiveDeliverySlotError,
    SubscriptionNotActiveError,
)
from app.models import DeliverySlot, Order, Product, SubscriptionPlan, User
from app.models.delivery_slot import format_time
from app.schemas.delivery_slot import DeliverySlotCreate, DeliverySlotUpdate
from app.schemas.subscription import SubscriptionCreate
from app.services import delivery_slot_service
from app.services.subscription_service import (
    cancel_subscription,
    change_delivery_slot,
    create_subscription,
    generate_orders_for,
)
from tests import factories

TODAY = date(2026, 11, 20)
TOMORROW = TODAY + timedelta(days=1)


def subscribe(
    db: Session, slot: DeliverySlot, product: Product, user: User | None = None
):
    user = user or factories.make_user(db)
    data = SubscriptionCreate.model_validate(
        {
            "plan": SubscriptionPlan.WEEK,
            "start_date": TOMORROW,
            "delivery_slot_id": slot.delivery_slot_id,
            "customer": {"name": "Ravi Kumar", "phone": "9876543210"},
            "items": [{"product_id": product.product_id, "quantity": 1}],
        }
    )
    return create_subscription(db, data, user, today=TODAY)


@pytest.fixture
def milk(db_session: Session) -> Product:
    return factories.make_product(db_session, stock_quantity=100)


def booked(db: Session, slot: DeliverySlot) -> int:
    return delivery_slot_service.booked_count(db, slot.delivery_slot_id)


# ---- the standard slots ----


def test_the_migration_creates_the_two_standard_slots(db_session: Session) -> None:
    slots = db_session.scalars(
        select(DeliverySlot).where(
            DeliverySlot.start_time.in_([time(8, 0), time(17, 0)])
        )
    ).all()
    assert sorted((s.label, s.capacity, s.is_active) for s in slots) == [
        ("Evening, 5:00 PM – 6:00 PM", 50, True),
        ("Morning, 8:00 AM – 9:00 AM", 50, True),
    ]


@pytest.mark.parametrize(
    ("value", "text"),
    [
        (time(0, 0), "12:00 AM"),
        (time(8, 5), "8:05 AM"),
        (time(12, 0), "12:00 PM"),
        (time(17, 30), "5:30 PM"),
    ],
)
def test_times_are_shown_the_way_customers_read_them(value: time, text: str) -> None:
    assert format_time(value) == text


# ---- booking and capacity ----


def test_a_full_slot_refuses_the_next_subscription(
    db_session: Session, milk: Product
) -> None:
    slot = factories.make_slot(db_session, capacity=2)
    subscribe(db_session, slot, milk)
    subscribe(db_session, slot, milk)

    with pytest.raises(DeliverySlotFullError):
        subscribe(db_session, slot, milk)
    assert booked(db_session, slot) == 2


def test_cancelling_frees_the_place(db_session: Session, milk: Product) -> None:
    slot = factories.make_slot(db_session, capacity=1)
    user = factories.make_user(db_session)
    first = subscribe(db_session, slot, milk, user)

    cancel_subscription(db_session, first.subscription_id, user, today=TODAY)

    assert booked(db_session, slot) == 0
    subscribe(db_session, slot, milk)  # the place is free again
    assert booked(db_session, slot) == 1


def test_a_switched_off_slot_cannot_be_booked(
    db_session: Session, milk: Product
) -> None:
    slot = factories.make_slot(db_session, is_active=False)

    with pytest.raises(InvalidFieldError) as error:
        subscribe(db_session, slot, milk)
    assert error.value.details[0].field == "delivery_slot_id"


def test_an_unknown_slot_cannot_be_booked(db_session: Session, milk: Product) -> None:
    ghost = DeliverySlot(delivery_slot_id=999_999)
    with pytest.raises(InvalidFieldError):
        subscribe(db_session, ghost, milk)


def test_lowering_the_capacity_keeps_existing_bookings(
    db_session: Session, milk: Product
) -> None:
    slot = factories.make_slot(db_session, capacity=3)
    subscribe(db_session, slot, milk)
    subscribe(db_session, slot, milk)

    delivery_slot_service.update_slot(
        db_session, slot.delivery_slot_id, DeliverySlotUpdate(capacity=1)
    )

    assert booked(db_session, slot) == 2  # nobody lost their place
    [(listed, count)] = [
        (s, c)
        for s, c in delivery_slot_service.list_available(db_session)
        if s.delivery_slot_id == slot.delivery_slot_id
    ]
    assert (listed.capacity, count) == (1, 2)
    with pytest.raises(DeliverySlotFullError):
        subscribe(db_session, slot, milk)


# ---- change the time ----


def test_change_time_moves_the_booking(db_session: Session, milk: Product) -> None:
    morning, evening = factories.make_slot(db_session), factories.make_slot(db_session)
    user = factories.make_user(db_session)
    subscription = subscribe(db_session, morning, milk, user)

    changed = change_delivery_slot(
        db_session,
        subscription.subscription_id,
        evening.delivery_slot_id,
        user,
        today=TODAY,
    )

    assert changed.delivery_slot_id == evening.delivery_slot_id
    assert (booked(db_session, morning), booked(db_session, evening)) == (0, 1)


def test_change_time_to_a_full_slot_is_refused(
    db_session: Session, milk: Product
) -> None:
    morning = factories.make_slot(db_session)
    full = factories.make_slot(db_session, capacity=1)
    subscribe(db_session, full, milk)
    user = factories.make_user(db_session)
    subscription = subscribe(db_session, morning, milk, user)

    with pytest.raises(DeliverySlotFullError):
        change_delivery_slot(
            db_session,
            subscription.subscription_id,
            full.delivery_slot_id,
            user,
            today=TODAY,
        )


def test_choosing_the_same_slot_again_is_fine_even_when_full(
    db_session: Session, milk: Product
) -> None:
    slot = factories.make_slot(db_session, capacity=1)
    user = factories.make_user(db_session)
    subscription = subscribe(db_session, slot, milk, user)

    same = change_delivery_slot(
        db_session,
        subscription.subscription_id,
        slot.delivery_slot_id,
        user,
        today=TODAY,
    )
    assert same.delivery_slot_id == slot.delivery_slot_id


def test_a_cancelled_subscription_cannot_change_time(
    db_session: Session, milk: Product
) -> None:
    morning, evening = factories.make_slot(db_session), factories.make_slot(db_session)
    user = factories.make_user(db_session)
    subscription = subscribe(db_session, morning, milk, user)
    cancel_subscription(db_session, subscription.subscription_id, user, today=TODAY)

    with pytest.raises(SubscriptionNotActiveError):
        change_delivery_slot(
            db_session,
            subscription.subscription_id,
            evening.delivery_slot_id,
            user,
            today=TODAY,
        )


# ---- the orders carry a copy of the time ----


def test_orders_keep_their_time_when_the_admin_edits_the_slot(
    db_session: Session, milk: Product
) -> None:
    slot = factories.make_slot(db_session, name="Early", start=time(6, 0), minutes=60)
    subscribe(db_session, slot, milk)

    [(_, order_id)] = generate_orders_for(db_session, TOMORROW).created
    delivery_slot_service.update_slot(
        db_session, slot.delivery_slot_id, DeliverySlotUpdate(name="Dawn")
    )
    [(_, next_id)] = generate_orders_for(
        db_session, TOMORROW + timedelta(days=1)
    ).created

    first, second = db_session.get(Order, order_id), db_session.get(Order, next_id)
    assert first is not None and second is not None
    assert first.delivery_slot == "Early, 6:00 AM – 7:00 AM"
    assert second.delivery_slot == "Dawn, 6:00 AM – 7:00 AM"


# ---- admin: add / edit / delete ----


def test_admin_adds_a_slot(db_session: Session) -> None:
    slot = delivery_slot_service.create_slot(
        db_session,
        DeliverySlotCreate(
            name="Late morning",
            start_time=time(10, 0),
            end_time=time(11, 0),
            capacity=20,
        ),
    )
    assert (slot.label, slot.is_active) == ("Late morning, 10:00 AM – 11:00 AM", True)


def test_same_times_twice_is_refused(db_session: Session) -> None:
    with pytest.raises(DeliverySlotAlreadyExistsError):
        delivery_slot_service.create_slot(
            db_session,
            DeliverySlotCreate(
                name="Copy", start_time=time(8, 0), end_time=time(9, 0), capacity=5
            ),
        )


def test_editing_end_before_start_is_refused(db_session: Session) -> None:
    slot = factories.make_slot(db_session, start=time(10, 0), minutes=60)
    with pytest.raises(InvalidFieldError):
        delivery_slot_service.update_slot(
            db_session, slot.delivery_slot_id, DeliverySlotUpdate(end_time=time(9, 0))
        )


def test_a_booked_slot_cannot_be_deleted(db_session: Session, milk: Product) -> None:
    slot = factories.make_slot(db_session)
    subscribe(db_session, slot, milk)

    with pytest.raises(DeliverySlotInUseError):
        delivery_slot_service.delete_slot(db_session, slot.delivery_slot_id)


def test_an_unused_slot_can_be_deleted(db_session: Session) -> None:
    slot = factories.make_slot(db_session)
    slot_id = slot.delivery_slot_id

    delivery_slot_service.delete_slot(db_session, slot_id)

    assert db_session.get(DeliverySlot, slot_id) is None


def switch_off_all_but(db: Session, keep: DeliverySlot) -> None:
    for slot in db.scalars(select(DeliverySlot)):
        if slot.delivery_slot_id != keep.delivery_slot_id:
            slot.is_active = False
    db.flush()


def test_the_last_active_slot_cannot_be_switched_off(db_session: Session) -> None:
    last = factories.standard_slot(db_session)
    switch_off_all_but(db_session, last)

    with pytest.raises(LastActiveDeliverySlotError):
        delivery_slot_service.update_slot(
            db_session, last.delivery_slot_id, DeliverySlotUpdate(is_active=False)
        )


def test_the_last_active_slot_cannot_be_deleted(db_session: Session) -> None:
    last = factories.make_slot(db_session)
    switch_off_all_but(db_session, last)

    with pytest.raises(LastActiveDeliverySlotError):
        delivery_slot_service.delete_slot(db_session, last.delivery_slot_id)


def test_a_slot_can_be_switched_off_while_another_is_active(
    db_session: Session,
) -> None:
    slot = factories.make_slot(db_session)

    updated = delivery_slot_service.update_slot(
        db_session, slot.delivery_slot_id, DeliverySlotUpdate(is_active=False)
    )

    assert updated.is_active is False
    available = [
        s.delivery_slot_id for s, _ in delivery_slot_service.list_available(db_session)
    ]
    assert slot.delivery_slot_id not in available
