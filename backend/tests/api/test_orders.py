"""API tests for the customer order endpoints (M3-01, M3-04, M3-05; login: #90)."""

import re

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Customer, Order, OrderItem, User
from tests import factories

URL = "/api/v1/orders"
ISO_UTC = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")


def body(customer_phone: str = "9876543210", items: list | None = None) -> dict:
    return {
        "customer": {"name": "Ravi Kumar", "phone": customer_phone},
        "items": items if items is not None else [],
    }


def count(db: Session, model) -> int:
    return db.scalar(select(func.count()).select_from(model))


@pytest.fixture
def client(client: TestClient, normal_user: User) -> TestClient:
    """Ordering needs login since #90: requests in this module are sent as a logged-in
    USER (`normal_user`). `anonymous` below is the same client without the token."""
    client.headers.update(factories.auth_header(normal_user))
    return client


@pytest.fixture
def anonymous(client: TestClient) -> TestClient:
    del client.headers["Authorization"]
    return client


@pytest.fixture
def cow_1l(db_session: Session):
    return factories.make_product(
        db_session, name="Cow Milk", size="1 Litre", price="60.00"
    )


@pytest.fixture
def buffalo_500(db_session: Session):
    return factories.make_product(
        db_session, name="Buffalo Milk", size="500 ml", price="35.00"
    )


# ---- POST /orders ----


def test_create_matches_the_contract_example(
    client: TestClient, cow_1l, buffalo_500
) -> None:
    response = client.post(
        URL,
        json=body(
            items=[
                {"product_id": cow_1l.product_id, "quantity": 2},
                {"product_id": buffalo_500.product_id, "quantity": 1},
            ]
        ),
    )

    assert response.status_code == 201
    order = response.json()
    assert response.headers["Location"] == f"/api/v1/orders/{order['order_id']}"
    assert order["status"] == "PLACED"
    assert ISO_UTC.match(order["order_date"])
    assert order["customer"]["name"] == "Ravi Kumar"
    assert order["customer"]["phone"] == "9876543210"
    lines = [
        (i["product_name"], i["size"], i["quantity"], i["unit_price"], i["subtotal"])
        for i in order["items"]
    ]
    assert lines == [
        ("Cow Milk", "1 Litre", 2, "60.00", "120.00"),
        ("Buffalo Milk", "500 ml", 1, "35.00", "35.00"),
    ]
    assert order["total_amount"] == "155.00"  # 2 × 60 + 1 × 35, from the database


@pytest.mark.parametrize("field", ["total_amount", "price", "unit_price"])
def test_prices_or_totals_from_the_client_are_rejected(
    client: TestClient, cow_1l, field: str
) -> None:
    request = body(items=[{"product_id": cow_1l.product_id, "quantity": 1}])
    if field == "total_amount":
        request["total_amount"] = "1.00"
    else:
        request["items"][0][field] = "1.00"

    response = client.post(URL, json=request)

    assert response.status_code == 422


def test_duplicate_product_is_400(
    client: TestClient, db_session: Session, cow_1l
) -> None:
    item = {"product_id": cow_1l.product_id, "quantity": 1}

    response = client.post(URL, json=body(items=[item, item]))

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "DUPLICATE_PRODUCT"
    assert response.json()["error"]["details"] == [
        {"field": "items[1].product_id", "issue": "duplicate"}
    ]
    assert count(db_session, Order) == 0


def test_unknown_product_is_404_and_nothing_is_saved(
    client: TestClient, db_session: Session, cow_1l
) -> None:
    response = client.post(
        URL,
        json=body(
            items=[
                {"product_id": cow_1l.product_id, "quantity": 1},
                {"product_id": 424242, "quantity": 1},
            ]
        ),
    )

    assert response.status_code == 404
    assert response.json()["error"]["message"] == "Product 424242 was not found."
    assert response.json()["error"]["details"][0]["field"] == "items[1].product_id"
    assert (count(db_session, Order), count(db_session, Customer)) == (0, 0)


def test_unavailable_product_is_409(client: TestClient, db_session: Session) -> None:
    hidden = factories.make_product(
        db_session, name="Buffalo Milk", size="1 Litre", is_available=False
    )

    response = client.post(
        URL, json=body(items=[{"product_id": hidden.product_id, "quantity": 1}])
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "PRODUCT_UNAVAILABLE"
    assert (
        response.json()["error"]["message"]
        == "Product 'Buffalo Milk 1 Litre' is currently unavailable."
    )


@pytest.mark.parametrize(
    ("change", "field"),
    [
        ({"customer": {"name": "A", "phone": "9876543210"}}, "customer.name"),
        ({"customer": {"name": "Ravi", "phone": "5876543210"}}, "customer.phone"),
        ({"customer": {"name": "Ravi", "phone": "98765"}}, "customer.phone"),
        ({"items": []}, "items"),
        ({"items": [{"product_id": i, "quantity": 1} for i in range(1, 12)]}, "items"),
        ({"items": [{"product_id": 0, "quantity": 1}]}, "items[0].product_id"),
        ({"items": [{"product_id": 1, "quantity": 0}]}, "items[0].quantity"),
        ({"items": [{"product_id": 1, "quantity": 21}]}, "items[0].quantity"),
    ],
)
def test_validation_rules(client: TestClient, change: dict, field: str) -> None:
    request = body(items=[{"product_id": 1, "quantity": 1}]) | change

    response = client.post(URL, json=request)

    assert response.status_code == 422
    assert field in {d["field"] for d in response.json()["error"]["details"]}


def test_existing_phone_reuses_the_customer(
    client: TestClient, db_session: Session, cow_1l
) -> None:
    items = [{"product_id": cow_1l.product_id, "quantity": 1}]

    first = client.post(URL, json=body(items=items)).json()
    second = client.post(URL, json=body(items=items)).json()

    assert first["customer"]["customer_id"] == second["customer"]["customer_id"]
    assert count(db_session, Customer) == 1


def test_price_change_does_not_alter_placed_orders(
    client: TestClient, db_session: Session, cow_1l, admin_user
) -> None:
    order = client.post(
        URL, json=body(items=[{"product_id": cow_1l.product_id, "quantity": 2}])
    ).json()

    changed = client.patch(
        f"/api/v1/admin/products/{cow_1l.product_id}",
        json={"price": "75.00"},
        headers=factories.auth_header(admin_user),  # admin APIs need an admin (#89)
    )
    assert changed.json()["price"] == "75.00"  # the change really happened

    again = client.get(f"{URL}/{order['order_id']}").json()
    assert again["items"][0]["unit_price"] == "60.00"
    assert again["total_amount"] == "120.00"


# ---- login required (#90) ----


@pytest.mark.parametrize(
    ("method", "url"),
    [("POST", URL), ("GET", URL + "/mine"), ("GET", URL + "/1")],
)
def test_order_endpoints_need_login(
    anonymous: TestClient, db_session: Session, method: str, url: str
) -> None:
    response = anonymous.request(
        method, url, json=body(items=[{"product_id": 1, "quantity": 1}])
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"
    assert count(db_session, Order) == 0


def test_order_is_saved_with_the_logged_in_account(
    client: TestClient, db_session: Session, normal_user: User, cow_1l
) -> None:
    created = client.post(
        URL, json=body(items=[{"product_id": cow_1l.product_id, "quantity": 1}])
    ).json()

    order = db_session.get(Order, created["order_id"])
    assert order.user_id == normal_user.user_id


def test_admins_can_order_too(client: TestClient, admin_user: User, cow_1l) -> None:
    response = client.post(
        URL,
        json=body(items=[{"product_id": cow_1l.product_id, "quantity": 1}]),
        headers=factories.auth_header(admin_user),
    )

    assert response.status_code == 201


# ---- GET /orders/{id}: owner or admin only (#90) ----


def test_owner_can_see_the_order(
    client: TestClient, db_session: Session, normal_user: User, cow_1l
) -> None:
    order = factories.make_order(db_session, items=[(cow_1l, 3)], user=normal_user)

    response = client.get(f"{URL}/{order.order_id}")

    assert response.status_code == 200
    assert response.json()["order_id"] == order.order_id
    assert response.json()["items"][0]["quantity"] == 3


def test_another_user_gets_404_like_a_missing_order(
    client: TestClient, db_session: Session, cow_1l
) -> None:
    someone_else = factories.make_user(db_session)
    order = factories.make_order(db_session, items=[(cow_1l, 1)], user=someone_else)

    response = client.get(f"{URL}/{order.order_id}")

    assert response.status_code == 404
    # Same message as for an id that does not exist: no hint that the order exists.
    assert (
        response.json()["error"]["message"] == f"Order {order.order_id} was not found."
    )


def test_admin_can_see_any_order_including_old_guest_orders(
    client: TestClient, db_session: Session, admin_user: User, normal_user: User, cow_1l
) -> None:
    users_order = factories.make_order(
        db_session, items=[(cow_1l, 1)], user=normal_user
    )
    guest_order = factories.make_order(db_session, items=[(cow_1l, 1)])  # before #90
    admin = factories.auth_header(admin_user)

    assert client.get(f"{URL}/{users_order.order_id}", headers=admin).status_code == 200
    assert client.get(f"{URL}/{guest_order.order_id}", headers=admin).status_code == 200
    # ...but a normal user cannot open an old guest order.
    assert client.get(f"{URL}/{guest_order.order_id}").status_code == 404


def test_get_unknown_order_is_404(client: TestClient) -> None:
    response = client.get(f"{URL}/424242")

    assert response.status_code == 404
    assert response.json()["error"]["message"] == "Order 424242 was not found."


# ---- GET /orders/mine (#90) ----


def test_my_orders_newest_first_with_item_count(
    client: TestClient, db_session: Session, normal_user: User, cow_1l, buffalo_500
) -> None:
    older = factories.make_order(db_session, items=[(cow_1l, 1)], user=normal_user)
    newer = factories.make_order(
        db_session, items=[(cow_1l, 1), (buffalo_500, 2)], user=normal_user
    )
    factories.make_order(
        db_session, items=[(cow_1l, 1)], user=factories.make_user(db_session)
    )
    factories.make_order(db_session, items=[(cow_1l, 1)])  # old guest order

    response = client.get(URL + "/mine")

    assert response.status_code == 200
    rows = response.json()
    assert [r["order_id"] for r in rows] == [newer.order_id, older.order_id]
    assert rows[0]["item_count"] == 2
    assert set(rows[0]) == {
        "order_id",
        "order_date",
        "status",
        "total_amount",
        "item_count",
        "subscription_id",  # #97
    }


def test_my_orders_is_empty_for_a_new_account(client: TestClient) -> None:
    response = client.get(URL + "/mine")

    assert (response.status_code, response.json()) == (200, [])


def test_phone_lookup_was_removed(client: TestClient) -> None:
    # GET /orders?phone= let anyone who knew a phone number see orders (removed in #90).
    response = client.get(URL, params={"phone": "9876543210"})

    assert response.status_code == 405  # only POST exists on /orders now


def test_order_item_lines_are_stored_with_database_prices(
    client: TestClient, db_session: Session, cow_1l
) -> None:
    client.post(
        URL, json=body(items=[{"product_id": cow_1l.product_id, "quantity": 4}])
    )

    item = db_session.scalars(select(OrderItem)).one()
    assert (str(item.unit_price), str(item.subtotal)) == ("60.00", "240.00")
