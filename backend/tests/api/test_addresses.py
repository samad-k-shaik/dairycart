"""Addresses (#102): my saved addresses, the default rules, and that orders and
subscriptions need one and keep a copy of it."""

from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Order, Product, SubscriptionPlan, User, UserRole
from app.schemas.subscription import SubscriptionCreate
from app.services import subscription_service
from tests import factories

URL = "/api/v1/addresses"
ORDERS = "/api/v1/orders"
SUBSCRIPTIONS = "/api/v1/subscriptions"

NEW = {
    "label": "Office",
    "house": "Plot 5, Cyber Towers",
    "street": "Hitech City",
    "landmark": "Opposite metro",
    "city": "Hyderabad",
    "pincode": "500081",
}


@pytest.fixture
def fresh(db_session: Session) -> User:
    """A user with NO saved address."""
    return factories.make_user(db_session, with_address=False)


@pytest.fixture
def as_fresh(fresh: User) -> dict[str, str]:
    return factories.auth_header(fresh)


@pytest.fixture
def milk(db_session: Session) -> Product:
    return factories.make_product(db_session, price="60.00")


def order_body(product: Product, address_id: int | None = None) -> dict:
    body: dict = {
        "customer": {"name": "Ravi Kumar", "phone": "9876543210"},
        "items": [{"product_id": product.product_id, "quantity": 1}],
    }
    if address_id is not None:
        body["address_id"] = address_id
    return body


def add(client: TestClient, headers: dict, **changes: object) -> dict:
    response = client.post(URL, json={**NEW, **changes}, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()


# ---- my addresses ----


def test_login_required(client: TestClient) -> None:
    assert client.get(URL).status_code == 401
    assert client.post(URL, json=NEW).status_code == 401


def test_first_address_becomes_the_default(client: TestClient, as_fresh) -> None:
    created = add(client, as_fresh)

    assert created["is_default"] is True
    assert created["full_text"] == (
        "Plot 5, Cyber Towers, Hitech City, Opposite metro, Hyderabad - 500081"
    )
    assert client.get(URL, headers=as_fresh).json() == [created]


def test_default_rules(client: TestClient, as_fresh) -> None:
    first = add(client, as_fresh, label="Home")
    second = add(client, as_fresh, label="Office")
    assert second["is_default"] is False

    third = add(client, as_fresh, label="Parents", is_default=True)
    listed = client.get(URL, headers=as_fresh).json()
    assert listed[0]["address_id"] == third["address_id"]  # default first
    assert [a["is_default"] for a in listed].count(True) == 1

    made = client.post(f"{URL}/{first['address_id']}/default", headers=as_fresh)
    assert made.status_code == 200
    defaults = [
        a["label"] for a in client.get(URL, headers=as_fresh).json() if a["is_default"]
    ]
    assert defaults == ["Home"]

    # Deleting the default makes the oldest remaining one (Office) the default.
    assert (
        client.delete(f"{URL}/{first['address_id']}", headers=as_fresh).status_code
        == 204
    )
    left = client.get(URL, headers=as_fresh).json()
    assert [(a["label"], a["is_default"]) for a in left] == [
        ("Office", True),
        ("Parents", False),
    ]


def test_edit_and_remove_the_landmark(client: TestClient, as_fresh) -> None:
    created = add(client, as_fresh)

    edited = client.patch(
        f"{URL}/{created['address_id']}",
        json={"street": "Madhapur", "landmark": ""},
        headers=as_fresh,
    )

    assert edited.status_code == 200
    assert (edited.json()["street"], edited.json()["landmark"]) == ("Madhapur", None)
    assert (
        edited.json()["full_text"]
        == "Plot 5, Cyber Towers, Madhapur, Hyderabad - 500081"
    )


@pytest.mark.parametrize(
    "changes",
    [
        {"pincode": "50008"},
        {"pincode": "050081"},
        {"pincode": "5000AB"},
        {"house": ""},
        {"city": "H"},
        {"label": "X" * 31},
    ],
)
def test_invalid_fields(client: TestClient, as_fresh, changes: dict) -> None:
    response = client.post(URL, json={**NEW, **changes}, headers=as_fresh)
    assert response.status_code == 422


def test_empty_patch_and_null_fields_are_refused(client: TestClient, as_fresh) -> None:
    created = add(client, as_fresh)
    url = f"{URL}/{created['address_id']}"
    assert client.patch(url, json={}, headers=as_fresh).status_code == 422
    assert client.patch(url, json={"city": None}, headers=as_fresh).status_code == 422


def test_at_most_ten_addresses(client: TestClient, as_fresh) -> None:
    for n in range(10):
        add(client, as_fresh, label=f"Place {n}")

    response = client.post(URL, json=NEW, headers=as_fresh)

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "ADDRESS_LIMIT_REACHED"


def test_someone_elses_address_is_404(
    client: TestClient, db_session: Session, as_fresh
) -> None:
    other = factories.make_user(db_session)  # has a default address
    [theirs] = client.get(URL, headers=factories.auth_header(other)).json()
    url = f"{URL}/{theirs['address_id']}"
    db_session.commit()  # keep the test data when the service rolls back after a 404

    assert client.patch(url, json={"city": "Pune"}, headers=as_fresh).status_code == 404
    assert client.post(f"{url}/default", headers=as_fresh).status_code == 404
    assert client.delete(url, headers=as_fresh).status_code == 404
    assert client.get(URL, headers=as_fresh).json() == []


# ---- orders need an address ----


def test_ordering_without_any_address_is_refused(
    client: TestClient, milk: Product, as_fresh
) -> None:
    response = client.post(ORDERS, json=order_body(milk), headers=as_fresh)

    assert response.status_code == 422
    assert response.json()["error"]["details"] == [
        {"field": "address_id", "issue": "required"}
    ]


def test_order_uses_the_default_or_the_chosen_address(
    client: TestClient, milk: Product, as_fresh
) -> None:
    home = add(
        client, as_fresh, label="Home", house="12-3 Sai Residency", street="MG Road"
    )
    office = add(client, as_fresh)

    by_default = client.post(ORDERS, json=order_body(milk), headers=as_fresh).json()
    chosen = client.post(
        ORDERS, json=order_body(milk, office["address_id"]), headers=as_fresh
    ).json()

    assert by_default["delivery_address"] == home["full_text"]
    assert chosen["delivery_address"] == office["full_text"]


def test_order_keeps_its_copy_after_the_address_changes(
    client: TestClient, milk: Product, as_fresh
) -> None:
    home = add(client, as_fresh)
    order = client.post(ORDERS, json=order_body(milk), headers=as_fresh).json()

    client.patch(f"{URL}/{home['address_id']}", json={"city": "Pune"}, headers=as_fresh)
    client.delete(f"{URL}/{home['address_id']}", headers=as_fresh)

    again = client.get(f"{ORDERS}/{order['order_id']}", headers=as_fresh).json()
    assert again["delivery_address"] == home["full_text"]  # still Hyderabad


def test_order_with_someone_elses_address_is_refused(
    client: TestClient, db_session: Session, milk: Product, as_fresh
) -> None:
    add(client, as_fresh)
    other = factories.make_user(db_session)
    [theirs] = client.get(URL, headers=factories.auth_header(other)).json()

    response = client.post(
        ORDERS, json=order_body(milk, theirs["address_id"]), headers=as_fresh
    )

    assert response.status_code == 422
    assert response.json()["error"]["details"] == [
        {"field": "address_id", "issue": "not available"}
    ]


# ---- subscriptions ----


def test_subscription_copies_the_address_onto_every_delivery(
    db_session: Session, milk: Product
) -> None:
    user = factories.make_user(db_session)
    today = date(2026, 11, 20)
    start = today + timedelta(days=1)
    data = SubscriptionCreate.model_validate(
        {
            "plan": SubscriptionPlan.WEEK,
            "start_date": start,
            "delivery_slot_id": factories.standard_slot(db_session).delivery_slot_id,
            "customer": {"name": "Ravi Kumar", "phone": "9876543210"},
            "items": [{"product_id": milk.product_id, "quantity": 1}],
        }
    )
    subscription = subscription_service.create_subscription(
        db_session, data, user, today=today
    )
    assert (
        subscription.delivery_address
        == "12-3 Sai Residency, MG Road, Ameerpet, Hyderabad - 500016"
    )

    [(_, order_id)] = subscription_service.generate_orders_for(
        db_session, start
    ).created

    order = db_session.get(Order, order_id)
    assert order is not None and order.delivery_address == subscription.delivery_address


def test_change_subscription_address(
    client: TestClient, db_session: Session, milk: Product, normal_user: User
) -> None:
    headers = factories.auth_header(normal_user)
    office = add(client, headers)
    start = subscription_service.today_ist() + timedelta(days=1)
    created = client.post(
        SUBSCRIPTIONS,
        json={
            "plan": "WEEK",
            "start_date": start.isoformat(),
            "delivery_slot_id": factories.standard_slot(db_session).delivery_slot_id,
            "customer": {"name": "Ravi Kumar", "phone": "9876543210"},
            "items": [{"product_id": milk.product_id, "quantity": 1}],
        },
        headers=headers,
    ).json()
    url = f"{SUBSCRIPTIONS}/{created['subscription_id']}/address"

    changed = client.patch(
        url, json={"address_id": office["address_id"]}, headers=headers
    )

    assert changed.status_code == 200
    assert changed.json()["delivery_address"] == office["full_text"]
    # Not the owner (even an admin cannot pick someone else's address) → 404.
    admin = factories.make_user(db_session, role=UserRole.ADMIN)
    other = client.patch(
        url,
        json={"address_id": office["address_id"]},
        headers=factories.auth_header(admin),
    )
    assert other.status_code == 404
