"""API tests for the admin order endpoints (M3-06, M3-07)."""

import itertools

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import OrderStatus
from app.services.order_service import ALLOWED_TRANSITIONS
from tests import factories

URL = "/api/v1/admin/orders"


@pytest.fixture
def client(client: TestClient, admin_user) -> TestClient:
    """Every request in this module is sent as a logged-in ADMIN (#89). Access rules
    themselves are tested in tests/api/test_auth.py."""
    client.headers.update(factories.auth_header(admin_user))
    return client


@pytest.fixture
def product(db_session: Session):
    return factories.make_product(db_session)


def test_list_newest_first_with_counts_across_all_orders(
    client: TestClient, db_session: Session, product
) -> None:
    placed = factories.make_order(db_session, items=[(product, 1)])
    delivered = factories.make_order(
        db_session, items=[(product, 2)], status=OrderStatus.DELIVERED
    )

    page = client.get(URL, params={"status": "DELIVERED"}).json()

    assert [o["order_id"] for o in page["items"]] == [delivered.order_id]
    assert (page["page"], page["page_size"], page["total"]) == (1, 20, 1)
    assert page["status_counts"] == {
        "PLACED": 1,
        "CONFIRMED": 0,
        "OUT_FOR_DELIVERY": 0,
        "DELIVERED": 1,
        "CANCELLED": 0,
    }
    row = page["items"][0]
    assert set(row) == {
        "order_id",
        "customer_name",
        "customer_phone",
        "order_date",
        "status",
        "total_amount",
        "item_count",
        "subscription_id",  # #97
    }
    everything = client.get(URL).json()
    assert [o["order_id"] for o in everything["items"]] == [
        delivered.order_id,
        placed.order_id,
    ]


def test_pagination(client: TestClient, db_session: Session, product) -> None:
    orders = [factories.make_order(db_session, items=[(product, 1)]) for _ in range(5)]

    page2 = client.get(URL, params={"page": 2, "page_size": 2}).json()

    newest_first = [o.order_id for o in reversed(orders)]
    assert [o["order_id"] for o in page2["items"]] == newest_first[2:4]
    assert page2["total"] == 5


def test_empty_list(client: TestClient) -> None:
    page = client.get(URL).json()

    assert (page["items"], page["total"]) == ([], 0)
    assert set(page["status_counts"].values()) == {0}


@pytest.mark.parametrize(
    "params",
    [{"page_size": 101}, {"page_size": 0}, {"page": 0}, {"status": "SHIPPED"}],
)
def test_invalid_query_is_422(client: TestClient, params: dict) -> None:
    assert client.get(URL, params=params).status_code == 422


# ---- status transitions: all 25 from/to pairs ----

ALL_PAIRS = list(itertools.product(OrderStatus, OrderStatus))


@pytest.mark.parametrize(("current", "new"), ALL_PAIRS, ids=lambda s: s.value)
def test_every_status_pair(
    client: TestClient, db_session: Session, product, current, new
) -> None:
    order = factories.make_order(db_session, items=[(product, 1)], status=current)

    response = client.patch(f"{URL}/{order.order_id}/status", json={"status": new})

    if new in ALLOWED_TRANSITIONS[current]:
        assert response.status_code == 200
        assert response.json()["status"] == new.value
    else:
        assert response.status_code == 409
        assert response.json()["error"]["code"] == "INVALID_STATUS_TRANSITION"
        assert response.json()["error"]["message"] == (
            f"Cannot change status from {current.value} to {new.value}."
        )


def test_transitions_match_the_functional_requirements_table() -> None:
    # docs/03-requirements/functional-requirements.md → Order status lifecycle: 5 arrows.
    # (Issue M3-06 says "6 allowed transitions"; the agreed table has 5.)
    allowed = {
        (current.value, new.value)
        for current, targets in ALLOWED_TRANSITIONS.items()
        for new in targets
    }
    assert allowed == {
        ("PLACED", "CONFIRMED"),
        ("PLACED", "CANCELLED"),
        ("CONFIRMED", "OUT_FOR_DELIVERY"),
        ("CONFIRMED", "CANCELLED"),
        ("OUT_FOR_DELIVERY", "DELIVERED"),
    }


def test_full_lifecycle_updates_the_dashboard_counts(
    client: TestClient, db_session: Session, product
) -> None:
    order = factories.make_order(db_session, items=[(product, 1)])
    for status in ["CONFIRMED", "OUT_FOR_DELIVERY", "DELIVERED"]:
        response = client.patch(
            f"{URL}/{order.order_id}/status", json={"status": status}
        )
        assert response.status_code == 200

    counts = client.get(URL).json()["status_counts"]
    assert (counts["PLACED"], counts["DELIVERED"]) == (0, 1)


def test_status_update_unknown_order_is_404(client: TestClient) -> None:
    response = client.patch(f"{URL}/424242/status", json={"status": "CONFIRMED"})

    assert response.status_code == 404


@pytest.mark.parametrize("payload", [{"status": "SHIPPED"}, {}, {"status": None}])
def test_status_update_invalid_body_is_422(
    client: TestClient, db_session: Session, product, payload: dict
) -> None:
    order = factories.make_order(db_session, items=[(product, 1)])

    assert (
        client.patch(f"{URL}/{order.order_id}/status", json=payload).status_code == 422
    )
