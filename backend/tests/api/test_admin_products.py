"""API tests for admin product management (issue #86):
POST, PATCH and DELETE /api/v1/admin/products."""

from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Product
from tests import factories

URL = "/api/v1/admin/products"
NEW_PRODUCT = {"name": "Toned Milk", "size": "500 ml", "price": "28.50"}


@pytest.fixture
def client(client: TestClient, admin_user) -> TestClient:
    """Every request in this module is sent as a logged-in ADMIN (#89). Access rules
    themselves are tested in tests/api/test_auth.py."""
    client.headers.update(factories.auth_header(admin_user))
    return client


def error_code(response) -> str:
    return response.json()["error"]["code"]


def error_fields(response) -> set[str]:
    return {detail["field"] for detail in response.json()["error"]["details"]}


# ---- POST: add ----


def test_create_returns_201_with_the_new_product(
    client: TestClient, db_session: Session
) -> None:
    response = client.post(URL, json=NEW_PRODUCT)

    assert response.status_code == 201
    body = response.json()
    assert body == {
        "product_id": body["product_id"],
        "name": "Toned Milk",
        "size": "500 ml",
        "price": "28.50",  # money is a string, like everywhere else
        "is_available": True,  # default
        "stock_quantity": 0,  # default (#92)
        "in_stock": False,
    }
    saved = db_session.get(Product, body["product_id"])
    assert saved is not None and saved.price == Decimal("28.50")


def test_created_product_appears_in_the_customer_list(client: TestClient) -> None:
    created = client.post(URL, json=NEW_PRODUCT).json()

    listed = client.get("/api/v1/products").json()

    # The public list has the same product, but WITHOUT the stock number (#92).
    public = {k: v for k, v in created.items() if k != "stock_quantity"}
    assert public in listed


def test_create_can_add_an_unavailable_product(client: TestClient) -> None:
    created = client.post(URL, json=NEW_PRODUCT | {"is_available": False}).json()

    assert created["is_available"] is False
    assert created not in client.get("/api/v1/products").json()


def test_create_trims_spaces(client: TestClient) -> None:
    body = client.post(
        URL, json={"name": "  Toned Milk ", "size": " 1 Litre ", "price": "50"}
    ).json()

    assert (body["name"], body["size"], body["price"]) == (
        "Toned Milk",
        "1 Litre",
        "50.00",
    )


def test_create_rejects_the_same_name_and_size_in_any_letter_case(
    client: TestClient, db_session: Session
) -> None:
    factories.make_product(db_session, name="Toned Milk", size="500 ml")

    response = client.post(URL, json=NEW_PRODUCT | {"name": "toned MILK"})

    assert response.status_code == 409
    assert error_code(response) == "PRODUCT_ALREADY_EXISTS"
    assert response.json()["error"]["message"] == (
        "A product named 'toned MILK' with size '500 ml' already exists."
    )


def test_same_name_with_a_different_size_is_allowed(
    client: TestClient, db_session: Session
) -> None:
    factories.make_product(db_session, name="Toned Milk", size="1 Litre")

    assert client.post(URL, json=NEW_PRODUCT).status_code == 201


@pytest.mark.parametrize(
    ("change", "field"),
    [
        ({"name": "A"}, "name"),  # too short
        ({"name": "x" * 101}, "name"),  # too long
        ({"name": "   "}, "name"),  # only spaces
        ({"size": ""}, "size"),
        ({"size": "x" * 21}, "size"),
        ({"price": "0"}, "price"),
        ({"price": "-5.00"}, "price"),
        ({"price": "12.345"}, "price"),  # more than 2 decimals
        ({"price": "123456789.00"}, "price"),  # does not fit NUMERIC(10,2)
        ({"price": "abc"}, "price"),
        ({"price": 45.5}, "price"),  # a JSON number, not a string
        ({"is_available": "maybe"}, "is_available"),
        ({"product_id": 7}, "product_id"),  # unknown/extra field
    ],
)
def test_create_validates_every_field(
    client: TestClient, change: dict, field: str
) -> None:
    response = client.post(URL, json=NEW_PRODUCT | change)

    assert response.status_code == 422
    assert error_code(response) == "VALIDATION_ERROR"
    assert field in error_fields(response)


@pytest.mark.parametrize("missing", ["name", "size", "price"])
def test_create_requires_name_size_and_price(client: TestClient, missing: str) -> None:
    body = {k: v for k, v in NEW_PRODUCT.items() if k != missing}

    response = client.post(URL, json=body)

    assert response.status_code == 422
    assert missing in error_fields(response)


# ---- PATCH: edit ----


def test_update_changes_only_the_fields_sent(
    client: TestClient, db_session: Session
) -> None:
    product = factories.make_product(
        db_session, name="Cow Milk", size="1 Litre", price="60.00"
    )

    response = client.patch(f"{URL}/{product.product_id}", json={"price": "65.00"})

    assert response.status_code == 200
    assert response.json() == {
        "product_id": product.product_id,
        "name": "Cow Milk",
        "size": "1 Litre",
        "price": "65.00",
        "is_available": True,
        "stock_quantity": 100,  # unchanged
        "in_stock": True,
    }


def test_update_can_change_every_field(client: TestClient, db_session: Session) -> None:
    product = factories.make_product(db_session)
    changes = {"name": "A2 Milk", "size": "2 Litre", "price": "140.00"}

    body = client.patch(
        f"{URL}/{product.product_id}",
        json=changes | {"is_available": False, "stock_quantity": 0},
    ).json()

    assert body == {
        "product_id": product.product_id,
        **changes,
        "is_available": False,
        "stock_quantity": 0,
        "in_stock": False,
    }


def test_mark_unavailable_hides_it_from_customers(
    client: TestClient, db_session: Session
) -> None:
    product = factories.make_product(db_session)

    client.patch(f"{URL}/{product.product_id}", json={"is_available": False})

    listed_ids = [p["product_id"] for p in client.get("/api/v1/products").json()]
    assert product.product_id not in listed_ids


def test_price_change_does_not_change_old_orders(
    client: TestClient, db_session: Session
) -> None:
    product = factories.make_product(db_session, price="60.00")
    order = factories.make_order(db_session, items=[(product, 2)])

    client.patch(f"{URL}/{product.product_id}", json={"price": "75.00"})

    db_session.refresh(order.items[0])
    assert order.items[0].unit_price == Decimal("60.00")  # BR-1


def test_update_rejects_a_name_and_size_used_by_another_product(
    client: TestClient, db_session: Session
) -> None:
    factories.make_product(db_session, name="Cow Milk", size="1 Litre")
    other = factories.make_product(db_session, name="Cow Milk", size="500 ml")

    response = client.patch(f"{URL}/{other.product_id}", json={"size": "1 litre"})

    assert response.status_code == 409
    assert error_code(response) == "PRODUCT_ALREADY_EXISTS"


def test_saving_a_product_with_its_own_name_and_size_is_fine(
    client: TestClient, db_session: Session
) -> None:
    product = factories.make_product(db_session, name="Cow Milk", size="1 Litre")

    response = client.patch(
        f"{URL}/{product.product_id}",
        json={"name": "Cow Milk", "size": "1 Litre", "price": "61.00"},
    )

    assert response.status_code == 200


@pytest.mark.parametrize(
    "body",
    [
        {},  # nothing to change
        {"price": None},  # null is not a value
        {"name": "A"},
        {"price": "0.00"},
        {"unknown": 1},
    ],
)
def test_update_validates_the_body(
    client: TestClient, db_session: Session, body: dict
) -> None:
    product = factories.make_product(db_session)

    response = client.patch(f"{URL}/{product.product_id}", json=body)

    assert response.status_code == 422
    assert error_code(response) == "VALIDATION_ERROR"


def test_update_unknown_product_is_404(client: TestClient) -> None:
    response = client.patch(f"{URL}/424242", json={"price": "10.00"})

    assert response.status_code == 404
    assert response.json()["error"]["message"] == "Product 424242 was not found."


# ---- DELETE ----


def test_delete_a_product_that_was_never_ordered(
    client: TestClient, db_session: Session
) -> None:
    product = factories.make_product(db_session)
    product_id = product.product_id

    response = client.delete(f"{URL}/{product_id}")

    assert response.status_code == 204
    assert response.content == b""
    db_session.expire_all()
    assert db_session.get(Product, product_id) is None
    assert client.get(f"/api/v1/products/{product_id}").status_code == 404


def test_delete_an_ordered_product_is_refused(
    client: TestClient, db_session: Session
) -> None:
    product = factories.make_product(db_session)
    factories.make_order(db_session, items=[(product, 1)])

    response = client.delete(f"{URL}/{product.product_id}")

    assert response.status_code == 409
    assert error_code(response) == "PRODUCT_IN_USE"
    assert "Mark it unavailable instead" in response.json()["error"]["message"]
    db_session.expire_all()
    assert db_session.get(Product, product.product_id) is not None


def test_delete_unknown_product_is_404(client: TestClient) -> None:
    response = client.delete(f"{URL}/424242")

    assert response.status_code == 404
    assert error_code(response) == "NOT_FOUND"


@pytest.mark.parametrize("bad_id", ["0", "-1", "abc"])
def test_invalid_ids_are_422(client: TestClient, bad_id: str) -> None:
    assert client.delete(f"{URL}/{bad_id}").status_code == 422
    assert client.patch(f"{URL}/{bad_id}", json={"price": "1.00"}).status_code == 422


# ---- docs ----


def test_admin_product_endpoints_are_documented(client: TestClient) -> None:
    paths = client.get("/openapi.json").json()["paths"]

    assert set(paths[URL]) == {"get", "post"}  # GET: admin list with stock (#92)
    assert set(paths[URL + "/{product_id}"]) == {"patch", "delete"}
    assert {"201", "409", "422"} <= set(paths[URL]["post"]["responses"])
    assert {"204", "404", "409"} <= set(
        paths[URL + "/{product_id}"]["delete"]["responses"]
    )
