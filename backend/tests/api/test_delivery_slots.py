"""Delivery slot API (#100): who may do what, response shapes, validation, and the
subscription "change time" endpoint."""

from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import DeliverySlot, Product, User
from app.services import subscription_service
from tests import factories

SLOTS = "/api/v1/delivery-slots"
ADMIN = "/api/v1/admin/delivery-slots"
SUBSCRIPTIONS = "/api/v1/subscriptions"


@pytest.fixture
def as_user(normal_user: User) -> dict[str, str]:
    return factories.auth_header(normal_user)


@pytest.fixture
def as_admin(admin_user: User) -> dict[str, str]:
    return factories.auth_header(admin_user)


@pytest.fixture
def milk(db_session: Session) -> Product:
    return factories.make_product(db_session, price="60.00")


def subscribe_body(product: Product, slot_id: int) -> dict:
    start = subscription_service.today_ist() + timedelta(days=1)
    return {
        "plan": "WEEK",
        "start_date": start.isoformat(),
        "delivery_slot_id": slot_id,
        "customer": {"name": "Ravi Kumar", "phone": "9876543210"},
        "items": [{"product_id": product.product_id, "quantity": 1}],
    }


# ---- customers ----


def test_customers_see_active_slots_with_places_left(
    client: TestClient, db_session: Session
) -> None:
    hidden = factories.make_slot(db_session, is_active=False)

    response = client.get(SLOTS)  # no login needed, like the product list

    assert response.status_code == 200
    slots = response.json()
    assert hidden.delivery_slot_id not in [s["delivery_slot_id"] for s in slots]
    morning = next(s for s in slots if s["name"] == "Morning")
    assert set(morning) == {
        "delivery_slot_id",
        "name",
        "start_time",
        "end_time",
        "label",
        "spaces_left",
        "is_full",
    }
    assert (morning["start_time"], morning["end_time"]) == ("08:00:00", "09:00:00")
    assert (morning["spaces_left"], morning["is_full"]) == (50, False)
    starts = [s["start_time"] for s in slots]
    assert starts == sorted(starts)  # earliest first


def test_a_full_slot_is_listed_as_full(
    client: TestClient, db_session: Session, milk: Product, as_user
) -> None:
    slot = factories.make_slot(db_session, capacity=1)
    created = client.post(
        SUBSCRIPTIONS, json=subscribe_body(milk, slot.delivery_slot_id), headers=as_user
    )
    assert created.status_code == 201

    listed = next(
        s
        for s in client.get(SLOTS).json()
        if s["delivery_slot_id"] == slot.delivery_slot_id
    )
    assert (listed["spaces_left"], listed["is_full"]) == (0, True)

    other = factories.make_user(db_session)
    refused = client.post(
        SUBSCRIPTIONS,
        json=subscribe_body(milk, slot.delivery_slot_id),
        headers=factories.auth_header(other),
    )
    assert refused.status_code == 409
    assert refused.json()["error"]["code"] == "DELIVERY_SLOT_FULL"


def test_subscribing_without_a_slot_is_refused(
    client: TestClient, milk: Product, as_user
) -> None:
    body = subscribe_body(milk, 1)
    del body["delivery_slot_id"]

    response = client.post(SUBSCRIPTIONS, json=body, headers=as_user)

    assert response.status_code == 422
    assert "delivery_slot_id" in [
        d["field"] for d in response.json()["error"]["details"]
    ]


def test_subscribing_to_a_switched_off_slot_is_refused(
    client: TestClient, db_session: Session, milk: Product, as_user
) -> None:
    slot = factories.make_slot(db_session, is_active=False)

    response = client.post(
        SUBSCRIPTIONS, json=subscribe_body(milk, slot.delivery_slot_id), headers=as_user
    )

    assert response.status_code == 422
    assert response.json()["error"]["details"] == [
        {"field": "delivery_slot_id", "issue": "not available"}
    ]


# ---- change the time ----


def test_owner_changes_the_time(
    client: TestClient, db_session: Session, milk: Product, as_user
) -> None:
    evening = factories.make_slot(db_session, name="Evening test")
    created = client.post(
        SUBSCRIPTIONS,
        json=subscribe_body(milk, factories.standard_slot(db_session).delivery_slot_id),
        headers=as_user,
    ).json()

    response = client.patch(
        f"{SUBSCRIPTIONS}/{created['subscription_id']}/delivery-slot",
        json={"delivery_slot_id": evening.delivery_slot_id},
        headers=as_user,
    )

    assert response.status_code == 200
    assert response.json()["delivery_slot"]["name"] == "Evening test"


def test_someone_else_cannot_change_the_time(
    client: TestClient, db_session: Session, milk: Product, as_user
) -> None:
    created = client.post(
        SUBSCRIPTIONS,
        json=subscribe_body(milk, factories.standard_slot(db_session).delivery_slot_id),
        headers=as_user,
    ).json()
    stranger = factories.auth_header(factories.make_user(db_session))

    response = client.patch(
        f"{SUBSCRIPTIONS}/{created['subscription_id']}/delivery-slot",
        json={"delivery_slot_id": factories.make_slot(db_session).delivery_slot_id},
        headers=stranger,
    )

    assert response.status_code == 404


def test_change_time_needs_login(client: TestClient) -> None:
    response = client.patch(
        f"{SUBSCRIPTIONS}/1/delivery-slot", json={"delivery_slot_id": 1}
    )
    assert response.status_code == 401


# ---- admin ----


def test_admin_endpoints_are_admin_only(client: TestClient, as_user) -> None:
    assert client.get(ADMIN).status_code == 401
    assert client.get(ADMIN, headers=as_user).status_code == 403
    assert client.post(ADMIN, json={}, headers=as_user).status_code == 403


def test_admin_list_shows_capacity_bookings_and_switched_off_slots(
    client: TestClient, db_session: Session, as_admin
) -> None:
    off = factories.make_slot(db_session, is_active=False, capacity=7)

    slots = client.get(ADMIN, headers=as_admin).json()

    row = next(s for s in slots if s["delivery_slot_id"] == off.delivery_slot_id)
    assert (row["capacity"], row["booked"], row["is_active"]) == (7, 0, False)


def test_admin_adds_edits_and_deletes_a_slot(client: TestClient, as_admin) -> None:
    created = client.post(
        ADMIN,
        json={
            "name": "Noon",
            "start_time": "12:00",
            "end_time": "12:45",
            "capacity": 15,
        },
        headers=as_admin,
    )
    assert created.status_code == 201
    slot = created.json()
    assert (slot["label"], slot["spaces_left"], slot["booked"]) == (
        "Noon, 12:00 PM – 12:45 PM",
        15,
        0,
    )
    url = f"{ADMIN}/{slot['delivery_slot_id']}"

    edited = client.patch(url, json={"capacity": 30, "name": "Lunch"}, headers=as_admin)
    assert edited.status_code == 200
    assert (edited.json()["name"], edited.json()["capacity"]) == ("Lunch", 30)

    assert client.delete(url, headers=as_admin).status_code == 204
    assert client.patch(url, json={"capacity": 5}, headers=as_admin).status_code == 404


@pytest.mark.parametrize(
    "body",
    [
        {"name": "Bad", "start_time": "09:00", "end_time": "08:00", "capacity": 5},
        {"name": "Bad", "start_time": "09:00:30", "end_time": "10:00", "capacity": 5},
        {"name": "Bad", "start_time": "09:00", "end_time": "10:00", "capacity": 0},
        {"name": "Bad", "start_time": "09:00", "end_time": "10:00", "capacity": 1001},
        {"name": "B", "start_time": "09:00", "end_time": "10:00", "capacity": 5},
        {"name": "Bad", "start_time": "25:00", "end_time": "10:00", "capacity": 5},
    ],
)
def test_invalid_slots_are_refused(client: TestClient, as_admin, body: dict) -> None:
    response = client.post(ADMIN, json=body, headers=as_admin)
    assert response.status_code == 422


def test_admin_cannot_add_the_same_times_twice(client: TestClient, as_admin) -> None:
    response = client.post(
        ADMIN,
        json={
            "name": "Copy",
            "start_time": "08:00",
            "end_time": "09:00",
            "capacity": 5,
        },
        headers=as_admin,
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "DELIVERY_SLOT_ALREADY_EXISTS"


def test_admin_cannot_delete_a_booked_slot(
    client: TestClient, db_session: Session, milk: Product, as_user, as_admin
) -> None:
    slot = factories.make_slot(db_session)
    client.post(
        SUBSCRIPTIONS, json=subscribe_body(milk, slot.delivery_slot_id), headers=as_user
    )

    response = client.delete(f"{ADMIN}/{slot.delivery_slot_id}", headers=as_admin)

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "DELIVERY_SLOT_IN_USE"


def test_admin_cannot_switch_off_the_last_active_slot(
    client: TestClient, db_session: Session, as_admin
) -> None:
    keep = factories.standard_slot(db_session)
    for slot in db_session.query(DeliverySlot).all():
        if slot.delivery_slot_id != keep.delivery_slot_id:
            slot.is_active = False
    db_session.flush()

    response = client.patch(
        f"{ADMIN}/{keep.delivery_slot_id}", json={"is_active": False}, headers=as_admin
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "LAST_ACTIVE_DELIVERY_SLOT"
