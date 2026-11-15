"""Stock quantity tests (#92): admin-only numbers, orders reduce stock, cancel restores."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Order, OrderStatus, Product, User
from app.scripts.seed import SEED_STOCK, seed
from tests import factories

ADMIN_PRODUCTS = "/api/v1/admin/products"
ORDERS = "/api/v1/orders"


def order_body(*lines: tuple[Product, int]) -> dict:
    return {
        "customer": {"name": "Ravi Kumar", "phone": "9876543210"},
        "items": [{"product_id": p.product_id, "quantity": q} for p, q in lines],
    }


def stock_of(db: Session, product: Product) -> int:
    db.expire(product)
    return product.stock_quantity


@pytest.fixture
def as_user(normal_user: User) -> dict[str, str]:
    return factories.auth_header(normal_user)


@pytest.fixture
def as_admin(admin_user: User) -> dict[str, str]:
    return factories.auth_header(admin_user)


# ---- who sees the number ----


def test_admin_list_shows_stock_numbers(
    client: TestClient, db_session: Session, as_admin
) -> None:
    product = factories.make_product(db_session, stock_quantity=7)

    rows = client.get(ADMIN_PRODUCTS, headers=as_admin).json()

    row = next(r for r in rows if r["product_id"] == product.product_id)
    assert (row["stock_quantity"], row["in_stock"]) == (7, True)


def test_public_api_never_returns_the_number(
    client: TestClient, db_session: Session
) -> None:
    factories.make_product(db_session, stock_quantity=7)
    empty = factories.make_product(db_session, stock_quantity=0)

    listed = client.get("/api/v1/products").json()
    details = client.get(f"/api/v1/products/{empty.product_id}").json()

    assert all("stock_quantity" not in p for p in listed + [details])
    assert details["in_stock"] is False  # only yes/no: "Out of stock"


def test_admin_product_list_needs_an_admin(client: TestClient, as_user) -> None:
    assert client.get(ADMIN_PRODUCTS).status_code == 401
    assert client.get(ADMIN_PRODUCTS, headers=as_user).status_code == 403


# ---- admin sets the stock ----


def test_admin_sets_stock_when_adding_and_editing(client: TestClient, as_admin) -> None:
    created = client.post(
        ADMIN_PRODUCTS,
        json={
            "name": "Toned Milk",
            "size": "500 ml",
            "price": "28.00",
            "stock_quantity": 40,
        },
        headers=as_admin,
    ).json()
    assert created["stock_quantity"] == 40

    edited = client.patch(
        f"{ADMIN_PRODUCTS}/{created['product_id']}",
        json={"stock_quantity": 55},
        headers=as_admin,
    ).json()
    assert edited["stock_quantity"] == 55


@pytest.mark.parametrize("bad", [-1, 100_001, 2.5, "lots"])
def test_stock_must_be_a_whole_number_0_to_100000(
    client: TestClient, db_session: Session, as_admin, bad
) -> None:
    product = factories.make_product(db_session)

    response = client.patch(
        f"{ADMIN_PRODUCTS}/{product.product_id}",
        json={"stock_quantity": bad},
        headers=as_admin,
    )

    assert response.status_code == 422


# ---- orders reduce stock ----


def test_order_reduces_the_stock_of_each_product(
    client: TestClient, db_session: Session, as_user
) -> None:
    cow = factories.make_product(db_session, stock_quantity=10)
    buffalo = factories.make_product(db_session, stock_quantity=5)

    response = client.post(
        ORDERS, json=order_body((cow, 3), (buffalo, 5)), headers=as_user
    )

    assert response.status_code == 201
    assert (stock_of(db_session, cow), stock_of(db_session, buffalo)) == (7, 0)


def test_ordering_more_than_the_stock_is_refused_and_nothing_changes(
    client: TestClient, db_session: Session, as_user
) -> None:
    cow = factories.make_product(
        db_session, name="Cow Milk", size="1 Litre", stock_quantity=10
    )
    buffalo = factories.make_product(
        db_session, name="Buffalo Milk", size="500 ml", stock_quantity=3
    )
    # Commit, like real products: the refused order's rollback must not remove them.
    # (In tests a commit only releases a savepoint; the test still ends with a rollback.)
    db_session.commit()

    response = client.post(
        ORDERS, json=order_body((cow, 2), (buffalo, 5)), headers=as_user
    )

    assert response.status_code == 409
    error = response.json()["error"]
    assert error["code"] == "INSUFFICIENT_STOCK"
    assert error["details"] == [
        {"field": "items[1].quantity", "issue": "more than in stock"}
    ]
    # The exact message: it names the product but never says how many are left.
    assert error["message"] == (
        "Only a limited quantity of 'Buffalo Milk 500 ml' is left. "
        "Please reduce the quantity."
    )
    # Nothing saved, and the first product's stock was not reduced either.
    assert db_session.scalar(select(func.count()).select_from(Order)) == 0
    assert (stock_of(db_session, cow), stock_of(db_session, buffalo)) == (10, 3)


def test_the_last_bottles_go_to_the_first_order_only(
    client: TestClient, db_session: Session, as_user
) -> None:
    product = factories.make_product(db_session, stock_quantity=2)

    first = client.post(ORDERS, json=order_body((product, 2)), headers=as_user)
    second = client.post(ORDERS, json=order_body((product, 1)), headers=as_user)

    assert (first.status_code, second.status_code) == (201, 409)
    assert stock_of(db_session, product) == 0
    public = client.get(f"/api/v1/products/{product.product_id}").json()
    assert public["in_stock"] is False


# ---- cancelling puts stock back ----


@pytest.mark.parametrize("from_status", [OrderStatus.PLACED, OrderStatus.CONFIRMED])
def test_cancelling_restores_the_stock(
    client: TestClient, db_session: Session, as_user, as_admin, from_status
) -> None:
    product = factories.make_product(db_session, stock_quantity=10)
    order_id = client.post(
        ORDERS, json=order_body((product, 4)), headers=as_user
    ).json()["order_id"]
    if from_status == OrderStatus.CONFIRMED:
        client.patch(
            f"/api/v1/admin/orders/{order_id}/status",
            json={"status": "CONFIRMED"},
            headers=as_admin,
        )
    assert stock_of(db_session, product) == 6

    response = client.patch(
        f"/api/v1/admin/orders/{order_id}/status",
        json={"status": "CANCELLED"},
        headers=as_admin,
    )

    assert response.status_code == 200
    assert stock_of(db_session, product) == 10


def test_delivering_does_not_change_the_stock(
    client: TestClient, db_session: Session, as_user, as_admin
) -> None:
    product = factories.make_product(db_session, stock_quantity=10)
    order_id = client.post(
        ORDERS, json=order_body((product, 4)), headers=as_user
    ).json()["order_id"]

    for status in ["CONFIRMED", "OUT_FOR_DELIVERY", "DELIVERED"]:
        client.patch(
            f"/api/v1/admin/orders/{order_id}/status",
            json={"status": status},
            headers=as_admin,
        )

    assert stock_of(db_session, product) == 6


def test_the_database_refuses_negative_stock(db_session: Session) -> None:
    from sqlalchemy.exc import IntegrityError

    product = factories.make_product(db_session, stock_quantity=1)
    product.stock_quantity = -1

    with pytest.raises(IntegrityError, match="ck_products_stock_quantity_non_negative"):
        db_session.flush()


def test_seeded_products_start_with_stock(db_session: Session) -> None:
    seed(db_session)

    stocks = db_session.scalars(select(Product.stock_quantity)).all()

    assert stocks and set(stocks) == {SEED_STOCK}
