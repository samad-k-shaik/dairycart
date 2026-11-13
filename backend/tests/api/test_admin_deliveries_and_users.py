"""#101 API: GET /admin/deliveries, GET /admin/users/{id}, GET /admin/users/{id}/orders,
and GET /admin/subscriptions?user_id=. ADMIN only."""

from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import OrderStatus, Product, User
from app.services.subscription_service import today_ist
from tests import factories

DELIVERIES = "/api/v1/admin/deliveries"
USERS = "/api/v1/admin/users"


@pytest.fixture
def as_admin(admin_user: User) -> dict[str, str]:
    return factories.auth_header(admin_user)


@pytest.fixture
def milk(db_session: Session) -> Product:
    return factories.make_product(db_session, name="Cow Milk", price="60.00")


@pytest.mark.parametrize("path", [DELIVERIES, f"{USERS}/1", f"{USERS}/1/orders"])
def test_admin_only(client: TestClient, normal_user: User, path: str) -> None:
    assert client.get(path).status_code == 401
    assert (
        client.get(path, headers=factories.auth_header(normal_user)).status_code == 403
    )


# ---- deliveries ----


def test_deliveries_default_to_today(
    client: TestClient, db_session: Session, milk: Product, normal_user: User, as_admin
) -> None:
    order = factories.make_order(db_session, items=[(milk, 2)], user=normal_user)

    response = client.get(DELIVERIES, headers=as_admin)

    assert response.status_code == 200
    body = response.json()
    assert body["date"] == today_ist().isoformat()
    row = next(r for r in body["deliveries"] if r["order_id"] == order.order_id)
    assert row == {
        "order_id": order.order_id,
        "user_id": normal_user.user_id,
        "username": normal_user.username,
        "customer_name": order.customer.name,
        "customer_phone": order.customer.phone,
        "subscription_id": None,
        "delivery_slot": None,
        "status": "PLACED",
        "total_amount": "120.00",
        "items": [
            {
                "product_id": milk.product_id,
                "product_name": "Cow Milk",
                "size": "1 Litre",
                "quantity": 2,
            }
        ],
    }
    assert {
        "product_id": milk.product_id,
        "product_name": "Cow Milk",
        "size": "1 Litre",
        "quantity": 2,
    } in body["product_totals"]
    assert set(body["status_counts"]) == {s.value for s in OrderStatus}


def test_deliveries_for_another_date(
    client: TestClient, db_session: Session, milk: Product, as_admin
) -> None:
    order = factories.make_order(db_session, items=[(milk, 1)])
    order.order_date = datetime(2026, 1, 15, 6, 0, tzinfo=UTC)  # 11:30 IST, 15 Jan
    db_session.flush()

    on_day = client.get(
        DELIVERIES, params={"date": "2026-01-15"}, headers=as_admin
    ).json()
    next_day = client.get(
        DELIVERIES, params={"date": "2026-01-16"}, headers=as_admin
    ).json()

    assert order.order_id in [r["order_id"] for r in on_day["deliveries"]]
    assert order.order_id not in [r["order_id"] for r in next_day["deliveries"]]


def test_deliveries_bad_date(client: TestClient, as_admin) -> None:
    response = client.get(DELIVERIES, params={"date": "15-01-2026"}, headers=as_admin)
    assert response.status_code == 422


# ---- one user ----


def test_user_details_with_totals(
    client: TestClient, db_session: Session, milk: Product, normal_user: User, as_admin
) -> None:
    factories.make_order(db_session, items=[(milk, 2)], user=normal_user)  # 120
    factories.make_order(db_session, items=[(milk, 1)], user=normal_user)  # 60
    factories.make_order(
        db_session, items=[(milk, 5)], user=normal_user, status=OrderStatus.CANCELLED
    )

    response = client.get(f"{USERS}/{normal_user.user_id}", headers=as_admin)

    assert response.status_code == 200
    body = response.json()
    assert body["username"] == normal_user.username
    assert (body["order_count"], body["total_spent"]) == (3, "180.00")
    assert "password_hash" not in body


def test_user_without_orders(client: TestClient, normal_user: User, as_admin) -> None:
    body = client.get(f"{USERS}/{normal_user.user_id}", headers=as_admin).json()
    assert (body["order_count"], body["total_spent"]) == (0, "0.00")


def test_user_orders_newest_first_only_theirs(
    client: TestClient, db_session: Session, milk: Product, normal_user: User, as_admin
) -> None:
    older = factories.make_order(db_session, items=[(milk, 1)], user=normal_user)
    older.order_date = datetime.now(UTC) - timedelta(days=2)
    newer = factories.make_order(db_session, items=[(milk, 2)], user=normal_user)
    factories.make_order(
        db_session, items=[(milk, 1)], user=factories.make_user(db_session)
    )
    db_session.flush()

    response = client.get(f"{USERS}/{normal_user.user_id}/orders", headers=as_admin)

    assert response.status_code == 200
    assert [o["order_id"] for o in response.json()] == [newer.order_id, older.order_id]


@pytest.mark.parametrize("suffix", ["", "/orders"])
def test_unknown_user_is_404(client: TestClient, as_admin, suffix: str) -> None:
    response = client.get(f"{USERS}/999999{suffix}", headers=as_admin)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_admin_subscriptions_filter_by_user(
    client: TestClient, db_session: Session, milk: Product, normal_user: User, as_admin
) -> None:
    start = (today_ist() + timedelta(days=1)).isoformat()
    body = {
        "plan": "WEEK",
        "start_date": start,
        "delivery_slot_id": factories.standard_slot(db_session).delivery_slot_id,
        "customer": {"name": "Ravi Kumar", "phone": "9876543210"},
        "items": [{"product_id": milk.product_id, "quantity": 1}],
    }
    mine = client.post(
        "/api/v1/subscriptions", json=body, headers=factories.auth_header(normal_user)
    ).json()
    other = factories.make_user(db_session)
    client.post(
        "/api/v1/subscriptions", json=body, headers=factories.auth_header(other)
    )

    rows = client.get(
        "/api/v1/admin/subscriptions",
        params={"user_id": normal_user.user_id},
        headers=as_admin,
    ).json()

    assert [r["subscription_id"] for r in rows] == [mine["subscription_id"]]
