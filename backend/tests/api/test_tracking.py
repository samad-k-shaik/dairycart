"""Live location during a delivery round (#110): start / stop the round, and the latest
position kept as ONE row per delivery boy (upsert), only while he is on a round."""

from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import DeliveryArea, DeliveryBoy, DeliveryLocation, UserRole
from app.services import tracking_service
from tests import factories

ME = "/api/v1/delivery/me"
START = "/api/v1/delivery/me/round/start"
STOP = "/api/v1/delivery/me/round/stop"
LOCATION = "/api/v1/delivery/me/location"
ADMIN_BOYS = "/api/v1/admin/delivery-boys"


@pytest.fixture
def ravi(db_session: Session) -> DeliveryBoy:
    """An active delivery boy with a login."""
    user = factories.make_user(
        db_session, phone="9876500001", role=UserRole.DELIVERY_BOY, with_address=False
    )
    boy = DeliveryBoy(name="Ravi Kumar", phone="9876500001", user_id=user.user_id)
    boy.areas.append(DeliveryArea(pincode="500016"))
    db_session.add(boy)
    db_session.flush()
    return boy


@pytest.fixture
def as_ravi(ravi: DeliveryBoy) -> dict[str, str]:
    assert ravi.user is not None
    return factories.auth_header(ravi.user)


def reading(lat: float = 17.4375, lng: float = 78.4483, seconds_ago: int = 0, **extra) -> dict:
    when = datetime.now(UTC) - timedelta(seconds=seconds_ago)
    return {"latitude": lat, "longitude": lng, "recorded_at": when.isoformat(), **extra}


def rows(db: Session) -> int:
    return db.scalar(select(func.count()).select_from(DeliveryLocation)) or 0


def test_location_is_refused_before_the_round_starts(
    client: TestClient, db_session: Session, as_ravi
) -> None:
    response = client.put(LOCATION, json=reading(), headers=as_ravi)

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "ROUND_NOT_STARTED"
    assert rows(db_session) == 0  # nothing stored without consent


def test_start_and_stop_the_round(client: TestClient, as_ravi) -> None:
    started = client.post(START, headers=as_ravi).json()
    me = client.get(ME, headers=as_ravi).json()
    again = client.post(START, headers=as_ravi).json()  # pressing twice keeps the start time
    stopped = client.post(STOP, headers=as_ravi).json()

    assert started["on_round"] is True and started["round_started_at"] is not None
    assert me["on_round"] is True
    assert again["round_started_at"] == started["round_started_at"]
    assert stopped == {"on_round": False, "round_started_at": None}


def test_the_latest_position_is_one_row_updated_in_place(
    client: TestClient, db_session: Session, ravi: DeliveryBoy, as_ravi
) -> None:
    client.post(START, headers=as_ravi)

    first = client.put(LOCATION, json=reading(17.43, 78.44, seconds_ago=20), headers=as_ravi)
    second = client.put(
        LOCATION, json=reading(17.44, 78.45, seconds_ago=5, accuracy_m=12), headers=as_ravi
    )

    assert (first.status_code, second.status_code) == (204, 204)
    assert rows(db_session) == 1
    saved = db_session.get(DeliveryLocation, ravi.delivery_boy_id)
    db_session.refresh(saved)
    assert (saved.latitude, saved.longitude, saved.accuracy_m) == (17.44, 78.45, 12)


def test_a_late_older_reading_never_moves_the_pin_back(
    client: TestClient, db_session: Session, ravi: DeliveryBoy, as_ravi
) -> None:
    client.post(START, headers=as_ravi)
    client.put(LOCATION, json=reading(17.44, 78.45, seconds_ago=5), headers=as_ravi)

    late = client.put(LOCATION, json=reading(17.40, 78.40, seconds_ago=30), headers=as_ravi)

    assert late.status_code == 204  # accepted, but ignored
    saved = db_session.get(DeliveryLocation, ravi.delivery_boy_id)
    db_session.refresh(saved)
    assert (saved.latitude, saved.longitude) == (17.44, 78.45)


def test_a_phone_clock_in_the_future_is_clamped(
    client: TestClient, db_session: Session, ravi: DeliveryBoy, as_ravi
) -> None:
    client.post(START, headers=as_ravi)
    future = datetime.now(UTC) + timedelta(hours=2)
    client.put(LOCATION, json={**reading(), "recorded_at": future.isoformat()}, headers=as_ravi)

    saved = db_session.get(DeliveryLocation, ravi.delivery_boy_id)
    assert saved is not None and saved.recorded_at <= datetime.now(UTC)
    # So the next real reading is still accepted.
    client.put(LOCATION, json=reading(17.45, 78.46), headers=as_ravi)
    db_session.refresh(saved)
    assert saved.latitude == 17.45


def test_stopping_the_round_deletes_the_position(
    client: TestClient, db_session: Session, as_ravi
) -> None:
    client.post(START, headers=as_ravi)
    client.put(LOCATION, json=reading(), headers=as_ravi)

    client.post(STOP, headers=as_ravi)

    assert rows(db_session) == 0
    assert client.put(LOCATION, json=reading(), headers=as_ravi).status_code == 409


@pytest.mark.parametrize(
    "body",
    [
        {"latitude": 91, "longitude": 78.4, "recorded_at": "2026-11-16T03:00:00Z"},
        {"latitude": 17.4, "longitude": 181, "recorded_at": "2026-11-16T03:00:00Z"},
        {"latitude": 17.4, "longitude": 78.4, "recorded_at": "2026-11-16T03:00:00"},  # no zone
        {"latitude": 17.4, "longitude": 78.4},  # no time
        {
            "latitude": 17.4,
            "longitude": 78.4,
            "recorded_at": "2026-11-16T03:00:00Z",
            "accuracy_m": -1,
        },
        {"latitude": 17.4, "longitude": 78.4, "recorded_at": "2026-11-16T03:00:00Z", "speed": 3},
    ],
)
def test_invalid_readings_are_refused(client: TestClient, as_ravi, body: dict) -> None:
    client.post(START, headers=as_ravi)
    assert client.put(LOCATION, json=body, headers=as_ravi).status_code == 422


def test_only_delivery_boys_can_share_a_location(
    client: TestClient, db_session: Session, admin_user
) -> None:
    customer = factories.auth_header(factories.make_user(db_session))
    assert client.put(LOCATION, json=reading()).status_code == 401
    assert client.put(LOCATION, json=reading(), headers=customer).status_code == 403
    assert client.post(START, headers=factories.auth_header(admin_user)).status_code == 403


def test_a_switched_off_delivery_boy_cannot_send(
    client: TestClient, db_session: Session, ravi: DeliveryBoy, as_ravi
) -> None:
    client.post(START, headers=as_ravi)
    ravi.is_active = False
    db_session.flush()

    assert client.put(LOCATION, json=reading(), headers=as_ravi).status_code == 403


def test_deleting_the_delivery_boy_deletes_his_position(
    client: TestClient, db_session: Session, ravi: DeliveryBoy, as_ravi, admin_user
) -> None:
    client.post(START, headers=as_ravi)
    client.put(LOCATION, json=reading(), headers=as_ravi)

    client.delete(f"{ADMIN_BOYS}/{ravi.delivery_boy_id}", headers=factories.auth_header(admin_user))

    assert rows(db_session) == 0


def test_stale_means_older_than_two_minutes() -> None:
    now = datetime(2026, 11, 16, 8, 0, tzinfo=UTC)
    assert tracking_service.is_stale(now - timedelta(minutes=3), now) is True
    assert tracking_service.is_stale(now - timedelta(seconds=90), now) is False
