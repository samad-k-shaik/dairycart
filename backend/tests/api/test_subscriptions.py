"""Subscription API (#97): who may do what, response shapes, and the admin button."""

from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Product, SubscriptionPlan, User
from app.schemas.subscription import SubscriptionCreate
from app.services import subscription_service
from tests import factories

SUBSCRIPTIONS = "/api/v1/subscriptions"
ADMIN = "/api/v1/admin/subscriptions"


def body(*lines: tuple[Product, int], plan: str = "WEEK", days_ahead: int = 1) -> dict:
    start = subscription_service.today_ist() + timedelta(days=days_ahead)
    return {
        "plan": plan,
        "start_date": start.isoformat(),
        "customer": {"name": "Ravi Kumar", "phone": "9876543210"},
        "items": [{"product_id": p.product_id, "quantity": q} for p, q in lines],
    }


def starting_today(db: Session, user: User, product: Product) -> int:
    """A subscription that delivers TODAY (the API only allows tomorrow or later), so
    the admin button has something to do. Returns its id."""
    today = subscription_service.today_ist()
    data = SubscriptionCreate.model_validate(
        {
            "plan": SubscriptionPlan.WEEK,
            "start_date": today,
            "customer": {"name": "Ravi Kumar", "phone": "9876543210"},
            "items": [{"product_id": product.product_id, "quantity": 2}],
        }
    )
    subscription = subscription_service.create_subscription(
        db, data, user, today=today - timedelta(days=1)
    )
    return subscription.subscription_id


@pytest.fixture
def as_user(normal_user: User) -> dict[str, str]:
    return factories.auth_header(normal_user)


@pytest.fixture
def as_admin(admin_user: User) -> dict[str, str]:
    return factories.auth_header(admin_user)


@pytest.fixture
def milk(db_session: Session) -> Product:
    return factories.make_product(
        db_session, name="Cow Milk", size="1 Litre", price="60.00"
    )


# ---- subscribe ----


def test_subscribe_returns_the_plan_with_backend_totals(
    client: TestClient, milk: Product, as_user
) -> None:
    response = client.post(SUBSCRIPTIONS, json=body((milk, 2)), headers=as_user)

    assert response.status_code == 201
    created = response.json()
    assert response.headers["Location"] == (
        f"/api/v1/subscriptions/{created['subscription_id']}"
    )
    assert created["status"] == "ACTIVE"
    assert (created["plan"], created["days"]) == ("WEEK", 7)
    assert (created["daily_total"], created["plan_total"]) == ("120.00", "840.00")
    assert created["items"] == [
        {
            "product_id": milk.product_id,
            "product_name": "Cow Milk",
            "size": "1 Litre",
            "quantity": 2,
            "unit_price": "60.00",
            "subtotal": "120.00",
        }
    ]
    assert (created["orders_created"], created["cancelled_at"]) == (0, None)


@pytest.mark.parametrize(("plan", "days"), [("HALF_MONTH", 15), ("MONTH", 30)])
def test_longer_plans(
    client: TestClient, milk: Product, as_user, plan: str, days: int
) -> None:
    created = client.post(
        SUBSCRIPTIONS, json=body((milk, 1), plan=plan), headers=as_user
    ).json()

    assert created["days"] == days
    assert created["plan_total"] == f"{60 * days}.00"


def test_subscribing_needs_login(client: TestClient, milk: Product) -> None:
    assert client.post(SUBSCRIPTIONS, json=body((milk, 1))).status_code == 401


def test_prices_sent_by_the_client_are_refused(
    client: TestClient, milk: Product, as_user
) -> None:
    sent = body((milk, 1))
    sent["items"][0]["unit_price"] = "1.00"

    response = client.post(SUBSCRIPTIONS, json=sent, headers=as_user)

    assert response.status_code == 422


@pytest.mark.parametrize("plan", ["DAILY", "YEAR", ""])
def test_unknown_plan_is_refused(
    client: TestClient, milk: Product, as_user, plan: str
) -> None:
    response = client.post(
        SUBSCRIPTIONS, json=body((milk, 1), plan=plan), headers=as_user
    )
    assert response.status_code == 422


def test_start_date_today_is_refused_under_the_field(
    client: TestClient, milk: Product, as_user
) -> None:
    response = client.post(
        SUBSCRIPTIONS, json=body((milk, 1), days_ahead=0), headers=as_user
    )

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "VALIDATION_ERROR"
    assert error["details"] == [{"field": "start_date", "issue": "out of range"}]


def test_second_active_subscription_is_refused(
    client: TestClient, db_session: Session, milk: Product, as_user
) -> None:
    client.post(SUBSCRIPTIONS, json=body((milk, 1)), headers=as_user)
    db_session.commit()  # keep the first one when the service rolls back

    response = client.post(SUBSCRIPTIONS, json=body((milk, 2)), headers=as_user)

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "SUBSCRIPTION_ALREADY_ACTIVE"


def test_more_than_the_stock_is_refused(
    client: TestClient, db_session: Session, as_user
) -> None:
    low = factories.make_product(db_session, stock_quantity=1)
    db_session.commit()

    response = client.post(SUBSCRIPTIONS, json=body((low, 2)), headers=as_user)

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "INSUFFICIENT_STOCK"


# ---- read ----


def test_my_subscriptions_shows_only_mine(
    client: TestClient, db_session: Session, milk: Product, as_user
) -> None:
    other = factories.make_user(db_session)
    client.post(
        SUBSCRIPTIONS, json=body((milk, 1)), headers=factories.auth_header(other)
    )
    mine = client.post(SUBSCRIPTIONS, json=body((milk, 3)), headers=as_user).json()

    listed = client.get(f"{SUBSCRIPTIONS}/mine", headers=as_user).json()

    assert [s["subscription_id"] for s in listed] == [mine["subscription_id"]]


def test_someone_elses_subscription_is_not_found(
    client: TestClient, db_session: Session, milk: Product, as_user, as_admin
) -> None:
    other = factories.make_user(db_session)
    theirs = client.post(
        SUBSCRIPTIONS, json=body((milk, 1)), headers=factories.auth_header(other)
    ).json()
    url = f"{SUBSCRIPTIONS}/{theirs['subscription_id']}"

    assert client.get(url, headers=as_user).status_code == 404
    assert client.post(f"{url}/cancel", headers=as_user).status_code == 404
    assert client.get(url, headers=as_admin).status_code == 200  # admins may look


# ---- cancel ----


def test_owner_cancels_and_cannot_cancel_twice(
    client: TestClient, db_session: Session, milk: Product, as_user
) -> None:
    created = client.post(SUBSCRIPTIONS, json=body((milk, 1)), headers=as_user).json()
    url = f"{SUBSCRIPTIONS}/{created['subscription_id']}/cancel"

    cancelled = client.post(url, headers=as_user)
    db_session.commit()
    again = client.post(url, headers=as_user)

    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "CANCELLED"
    assert cancelled.json()["cancelled_at"] is not None
    assert again.status_code == 409
    assert again.json()["error"]["code"] == "SUBSCRIPTION_NOT_ACTIVE"


def test_after_cancelling_the_user_can_subscribe_again(
    client: TestClient, milk: Product, as_user
) -> None:
    created = client.post(SUBSCRIPTIONS, json=body((milk, 1)), headers=as_user).json()
    client.post(f"{SUBSCRIPTIONS}/{created['subscription_id']}/cancel", headers=as_user)

    response = client.post(SUBSCRIPTIONS, json=body((milk, 2)), headers=as_user)

    assert response.status_code == 201


# ---- admin ----


def test_admin_endpoints_are_admin_only(client: TestClient, as_user) -> None:
    assert client.get(ADMIN).status_code == 401
    assert client.get(ADMIN, headers=as_user).status_code == 403
    assert client.post(f"{ADMIN}/generate-orders", headers=as_user).status_code == 403


def test_admin_list_with_status_filter(
    client: TestClient, normal_user: User, milk: Product, as_user, as_admin
) -> None:
    created = client.post(SUBSCRIPTIONS, json=body((milk, 1)), headers=as_user).json()

    active = client.get(ADMIN, params={"status": "ACTIVE"}, headers=as_admin).json()
    cancelled = client.get(ADMIN, params={"status": "CANCELLED"}, headers=as_admin)

    row = next(r for r in active if r["subscription_id"] == created["subscription_id"])
    assert row["username"] == normal_user.username
    assert (row["customer_name"], row["customer_phone"]) == ("Ravi Kumar", "9876543210")
    assert (row["plan"], row["daily_total"], row["orders_created"]) == (
        "WEEK",
        "60.00",
        0,
    )
    assert created["subscription_id"] not in [
        r["subscription_id"] for r in cancelled.json()
    ]


def test_generate_button_creates_todays_orders_once(
    client: TestClient,
    db_session: Session,
    normal_user: User,
    milk: Product,
    as_user,
    as_admin,
) -> None:
    subscription_id = starting_today(db_session, normal_user, milk)

    first = client.post(f"{ADMIN}/generate-orders", headers=as_admin).json()
    second = client.post(f"{ADMIN}/generate-orders", headers=as_admin).json()

    assert first["delivery_date"] == subscription_service.today_ist().isoformat()
    [made] = [c for c in first["created"] if c["subscription_id"] == subscription_id]
    assert subscription_id not in [c["subscription_id"] for c in second["created"]]
    assert second["already_created"] >= 1

    # The order is a normal order: in "My orders", marked with its subscription.
    mine = client.get("/api/v1/orders/mine", headers=as_user).json()
    assert [(o["order_id"], o["subscription_id"]) for o in mine] == [
        (made["order_id"], subscription_id)
    ]
    order = client.get(f"/api/v1/orders/{made['order_id']}", headers=as_user).json()
    assert order["delivery_date"] == subscription_service.today_ist().isoformat()
    assert order["total_amount"] == "120.00"
    detail = client.get(f"{SUBSCRIPTIONS}/{subscription_id}", headers=as_user).json()
    assert detail["orders_created"] == 1


def test_one_time_orders_have_no_subscription(
    client: TestClient, milk: Product, as_user
) -> None:
    order = client.post(
        "/api/v1/orders",
        json={
            "customer": {"name": "Ravi Kumar", "phone": "9876543210"},
            "items": [{"product_id": milk.product_id, "quantity": 1}],
        },
        headers=as_user,
    ).json()

    assert (order["subscription_id"], order["delivery_date"]) == (None, None)


def test_product_in_a_subscription_cannot_be_deleted(
    client: TestClient, db_session: Session, milk: Product, as_user, as_admin
) -> None:
    client.post(SUBSCRIPTIONS, json=body((milk, 1)), headers=as_user)
    db_session.commit()

    response = client.delete(
        f"/api/v1/admin/products/{milk.product_id}", headers=as_admin
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "PRODUCT_IN_USE"
