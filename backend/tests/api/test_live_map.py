"""Admin live map (#111): delivery boys' latest positions, stale flags and order pins."""

from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import DeliveryArea, DeliveryBoy, DeliveryLocation, Order, OrderStatus, User
from tests import factories

URL = "/api/v1/admin/delivery-boys/locations"


@pytest.fixture
def as_admin(admin_user: User) -> dict[str, str]:
    return factories.auth_header(admin_user)


def make_boy(db: Session, name: str, phone: str, pincode: str, *, on_round: bool) -> DeliveryBoy:
    boy = DeliveryBoy(name=name, phone=phone)
    boy.areas.append(DeliveryArea(pincode=pincode))
    if on_round:
        boy.round_started_at = datetime.now(UTC) - timedelta(minutes=30)
    db.add(boy)
    db.flush()
    return boy


def place(db: Session, boy: DeliveryBoy, minutes_ago: int, lat: float = 17.43, lng: float = 78.44):
    when = datetime.now(UTC) - timedelta(minutes=minutes_ago)
    db.add(
        DeliveryLocation(
            delivery_boy_id=boy.delivery_boy_id,
            latitude=lat,
            longitude=lng,
            accuracy_m=10,
            recorded_at=when,
            updated_at=when,
        )
    )
    db.flush()


def order_at(db: Session, pincode: str, status: OrderStatus, pin: bool = True) -> Order:
    order = factories.make_order(db, status=status)
    order.delivery_pincode = pincode
    if pin:
        order.delivery_latitude, order.delivery_longitude = 17.4375, 78.4483
    db.flush()
    return order


def test_admins_only(client: TestClient, db_session: Session) -> None:
    assert client.get(URL).status_code == 401
    customer = factories.auth_header(factories.make_user(db_session))
    assert client.get(URL, headers=customer).status_code == 403


def test_positions_stale_flags_and_order(client: TestClient, db_session: Session, as_admin) -> None:
    fresh = make_boy(db_session, "Zakir", "9876500001", "500016", on_round=True)
    old = make_boy(db_session, "Arun", "9876500002", "500081", on_round=True)
    off = make_boy(db_session, "Bala", "9876500003", "500001", on_round=False)
    place(db_session, fresh, minutes_ago=0)
    place(db_session, old, minutes_ago=5)  # no update for 5 minutes → stale
    place(db_session, off, minutes_ago=0)  # a leftover row is never shown off-round

    boys = {b["name"]: b for b in client.get(URL, headers=as_admin).json()}

    assert boys["Zakir"]["position"]["is_stale"] is False
    assert boys["Zakir"]["position"]["latitude"] == 17.43
    assert boys["Arun"]["position"]["is_stale"] is True
    assert boys["Bala"]["on_round"] is False and boys["Bala"]["position"] is None
    # On a round first, then by name.
    names = [b["name"] for b in client.get(URL, headers=as_admin).json()]
    assert names == ["Arun", "Zakir", "Bala"]


def test_on_a_round_but_no_reading_yet(client: TestClient, db_session: Session, as_admin) -> None:
    make_boy(db_session, "Ravi", "9876500001", "500016", on_round=True)
    [ravi] = client.get(URL, headers=as_admin).json()
    assert ravi["on_round"] is True and ravi["position"] is None


def test_order_pins_are_his_undelivered_pinned_orders_today(
    client: TestClient, db_session: Session, as_admin
) -> None:
    make_boy(db_session, "Ravi", "9876500001", "500016", on_round=True)
    to_deliver = order_at(db_session, "500016", OrderStatus.CONFIRMED)
    order_at(db_session, "500016", OrderStatus.DELIVERED)  # done: no pin
    order_at(db_session, "500016", OrderStatus.CANCELLED)  # cancelled: no pin
    order_at(db_session, "500016", OrderStatus.PLACED, pin=False)  # no map pin saved
    order_at(db_session, "500081", OrderStatus.CONFIRMED)  # someone else's area

    [ravi] = client.get(URL, headers=as_admin).json()

    assert [o["order_id"] for o in ravi["orders"]] == [to_deliver.order_id]
    assert ravi["orders"][0]["latitude"] == 17.4375


def test_switched_off_delivery_boys_are_left_out(
    client: TestClient, db_session: Session, as_admin
) -> None:
    boy = make_boy(db_session, "Ravi", "9876500001", "500016", on_round=True)
    boy.is_active = False
    db_session.flush()
    assert client.get(URL, headers=as_admin).json() == []
