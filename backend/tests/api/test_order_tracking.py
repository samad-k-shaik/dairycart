"""Customer order tracking (#112): who may see the delivery boy, and when; distance + ETA."""

from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import DeliveryArea, DeliveryBoy, DeliveryLocation, Order, OrderStatus, User
from app.services import geo
from tests import factories

HOME = (17.4375, 78.4483)  # the order's map pin
NEAR = (17.4465, 78.4483)  # 1.0 km north of it


@pytest.fixture
def customer(db_session: Session) -> User:
    return factories.make_user(db_session)


@pytest.fixture
def as_customer(customer: User) -> dict[str, str]:
    return factories.auth_header(customer)


@pytest.fixture
def ravi(db_session: Session) -> DeliveryBoy:
    """On a round in 500016, last seen just now 1 km from the customer."""
    boy = DeliveryBoy(
        name="Ravi Kumar",
        phone="9876500001",
        round_started_at=datetime.now(UTC) - timedelta(hours=1),
    )
    boy.areas.append(DeliveryArea(pincode="500016"))
    db_session.add(boy)
    db_session.flush()
    now = datetime.now(UTC)
    db_session.add(
        DeliveryLocation(
            delivery_boy_id=boy.delivery_boy_id,
            latitude=NEAR[0],
            longitude=NEAR[1],
            recorded_at=now,
            updated_at=now,
        )
    )
    db_session.flush()
    return boy


def my_order(db: Session, user: User, status: OrderStatus, pin: bool = True) -> Order:
    order = factories.make_order(db, status=status, user=user)
    order.delivery_pincode = "500016"
    if pin:
        order.delivery_latitude, order.delivery_longitude = HOME
    db.flush()
    return order


def track(client: TestClient, order: Order, headers: dict):
    return client.get(f"/api/v1/orders/{order.order_id}/tracking", headers=headers)


def test_out_for_delivery_shows_the_delivery_boy_distance_and_eta(
    client: TestClient, db_session: Session, customer: User, as_customer, ravi: DeliveryBoy
) -> None:
    order = my_order(db_session, customer, OrderStatus.OUT_FOR_DELIVERY)

    body = track(client, order, as_customer).json()

    assert body["status"] == "OUT_FOR_DELIVERY"
    assert body["delivery_boy"]["name"] == "Ravi"  # first name only
    assert body["delivery_boy"]["position"] == {"latitude": NEAR[0], "longitude": NEAR[1]}
    assert body["delivery_boy"]["is_stale"] is False
    assert "phone" not in body["delivery_boy"]  # never his phone number
    assert body["destination"] == {"latitude": HOME[0], "longitude": HOME[1]}
    assert body["distance_km"] == 1.0
    assert body["eta_minutes"] == 3  # 1 km at 20 km/h = 3 min


@pytest.mark.parametrize(
    "status",
    [OrderStatus.PLACED, OrderStatus.CONFIRMED, OrderStatus.DELIVERED, OrderStatus.CANCELLED],
)
def test_no_position_unless_out_for_delivery(
    client: TestClient, db_session: Session, customer: User, as_customer, ravi, status
) -> None:
    body = track(client, my_order(db_session, customer, status), as_customer).json()
    assert body["status"] == status.value
    assert (body["delivery_boy"], body["distance_km"], body["eta_minutes"]) == (None, None, None)


def test_no_position_when_he_is_not_on_a_round(
    client: TestClient, db_session: Session, customer: User, as_customer, ravi: DeliveryBoy
) -> None:
    ravi.round_started_at = None  # a leftover location row is never shown
    db_session.flush()
    order = my_order(db_session, customer, OrderStatus.OUT_FOR_DELIVERY)
    assert track(client, order, as_customer).json()["delivery_boy"] is None


def test_someone_elses_order_is_404(
    client: TestClient, db_session: Session, customer: User, ravi
) -> None:
    order = my_order(db_session, customer, OrderStatus.OUT_FOR_DELIVERY)
    stranger = factories.auth_header(factories.make_user(db_session))

    assert track(client, order, stranger).status_code == 404
    assert client.get(f"/api/v1/orders/{order.order_id}/tracking").status_code == 401


def test_without_a_map_pin_there_is_no_distance(
    client: TestClient, db_session: Session, customer: User, as_customer, ravi
) -> None:
    order = my_order(db_session, customer, OrderStatus.OUT_FOR_DELIVERY, pin=False)
    body = track(client, order, as_customer).json()
    assert body["delivery_boy"] is not None  # still shown on the map
    assert (body["destination"], body["distance_km"], body["eta_minutes"]) == (None, None, None)


def test_an_old_position_is_marked_stale(
    client: TestClient, db_session: Session, customer: User, as_customer, ravi: DeliveryBoy
) -> None:
    row = db_session.get(DeliveryLocation, ravi.delivery_boy_id)
    assert row is not None
    row.updated_at = datetime.now(UTC) - timedelta(minutes=5)
    db_session.flush()
    order = my_order(db_session, customer, OrderStatus.OUT_FOR_DELIVERY)
    assert track(client, order, as_customer).json()["delivery_boy"]["is_stale"] is True


# ---- geo helpers ----


def test_haversine_matches_known_distances() -> None:
    assert geo.haversine_km(*HOME, *HOME) == 0
    assert abs(geo.haversine_km(*HOME, *NEAR) - 1.0) < 0.01
    # Ameerpet → Hitech City ≈ 7.7 km in a straight line.
    assert 7.5 < geo.haversine_km(*HOME, 17.4474, 78.3762) < 8.0


def test_eta_rounds_up_and_is_at_least_one_minute() -> None:
    assert geo.eta_minutes(0.0) == 1
    assert geo.eta_minutes(1.0) == 3
    assert geo.eta_minutes(1.1) == 4  # 3.3 min → 4
    assert geo.eta_minutes(10, speed_kmh=30) == 20
