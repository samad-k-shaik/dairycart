"""API tests for GET /api/v1/products and GET /api/v1/products/{id} (M1-10)."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.scripts.seed import seed
from tests import factories

# The contract's example (docs/05-api/api-contracts.md), without product_id: ids depend
# on the database sequence, which rollbacks do not reset.
CONTRACT_LIST = [
    {"name": "Cow Milk", "size": "500 ml", "price": "30.00", "is_available": True},
    {"name": "Cow Milk", "size": "1 Litre", "price": "60.00", "is_available": True},
    {"name": "Buffalo Milk", "size": "500 ml", "price": "35.00", "is_available": True},
    {"name": "Buffalo Milk", "size": "1 Litre", "price": "70.00", "is_available": True},
]
PRODUCT_FIELDS = {"product_id", "name", "size", "price", "is_available"}


def without_ids(products: list[dict]) -> list[dict]:
    return [{k: v for k, v in p.items() if k != "product_id"} for p in products]


# ---- list ----


def test_list_matches_the_contract_example(
    client: TestClient, db_session: Session
) -> None:
    seed(db_session)

    response = client.get("/api/v1/products")

    assert response.status_code == 200
    body = response.json()
    assert all(set(p) == PRODUCT_FIELDS for p in body)  # exactly these fields
    assert without_ids(body) == CONTRACT_LIST
    ids = [p["product_id"] for p in body]
    assert ids == sorted(ids) and all(isinstance(i, int) for i in ids)  # ordered by id


def test_list_hides_unavailable_products_by_default(
    client: TestClient, db_session: Session
) -> None:
    available = factories.make_product(db_session)
    factories.make_product(db_session, is_available=False)

    body = client.get("/api/v1/products").json()

    assert [p["product_id"] for p in body] == [available.product_id]


def test_include_unavailable_true_shows_them(
    client: TestClient, db_session: Session
) -> None:
    available = factories.make_product(db_session)
    hidden = factories.make_product(db_session, is_available=False)

    body = client.get("/api/v1/products", params={"include_unavailable": "true"}).json()

    assert [(p["product_id"], p["is_available"]) for p in body] == [
        (available.product_id, True),
        (hidden.product_id, False),
    ]


def test_empty_catalogue_returns_an_empty_list_not_404(client: TestClient) -> None:
    response = client.get("/api/v1/products")

    assert response.status_code == 200
    assert response.json() == []


def test_include_unavailable_must_be_a_boolean(client: TestClient) -> None:
    response = client.get("/api/v1/products", params={"include_unavailable": "maybe"})

    assert response.status_code == 422
    assert response.json()["error"]["details"][0]["field"] == "include_unavailable"


# ---- details ----


def test_details_match_the_contract_example(
    client: TestClient, db_session: Session
) -> None:
    product = factories.make_product(
        db_session, name="Cow Milk", size="1 Litre", price="60.00"
    )

    response = client.get(f"/api/v1/products/{product.product_id}")

    assert response.status_code == 200
    assert response.json() == {
        "product_id": product.product_id,
        "name": "Cow Milk",
        "size": "1 Litre",
        "price": "60.00",
        "is_available": True,
    }


def test_details_also_return_unavailable_products(
    client: TestClient, db_session: Session
) -> None:
    product = factories.make_product(db_session, is_available=False)

    body = client.get(f"/api/v1/products/{product.product_id}").json()

    assert body["is_available"] is False


@pytest.mark.parametrize(
    ("price", "expected"), [("60", "60.00"), ("35.5", "35.50"), ("0.10", "0.10")]
)
def test_price_is_always_a_string_with_two_decimals(
    client: TestClient, db_session: Session, price: str, expected: str
) -> None:
    product = factories.make_product(db_session, price=price)

    assert (
        client.get(f"/api/v1/products/{product.product_id}").json()["price"] == expected
    )


def test_unknown_id_returns_404_not_found(client: TestClient) -> None:
    response = client.get("/api/v1/products/999999")

    assert response.status_code == 404
    error = response.json()["error"]
    assert error["code"] == "NOT_FOUND"
    assert error["message"] == "Product 999999 was not found."
    assert error["request_id"] == response.headers["X-Request-ID"]


@pytest.mark.parametrize("bad_id", ["0", "-1", "abc", "1.5"])
def test_invalid_id_returns_422(client: TestClient, bad_id: str) -> None:
    response = client.get(f"/api/v1/products/{bad_id}")

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "VALIDATION_ERROR"
    assert error["details"][0]["field"] == "product_id"


def test_products_are_documented(client: TestClient) -> None:
    paths = client.get("/openapi.json").json()["paths"]

    assert set(paths["/api/v1/products"]["get"]["responses"]) >= {"200", "422"}
    assert set(paths["/api/v1/products/{product_id}"]["get"]["responses"]) >= {
        "200",
        "404",
        "422",
    }
