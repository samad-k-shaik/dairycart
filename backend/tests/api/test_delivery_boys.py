"""Delivery boys and area allocation (#103): admin CRUD, one delivery boy per PIN code,
and the Deliveries page matching orders to delivery boys by PIN code."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models import Product, User
from tests import factories

URL = "/api/v1/admin/delivery-boys"
DELIVERIES = "/api/v1/admin/deliveries"


@pytest.fixture
def as_admin(admin_user: User) -> dict[str, str]:
    return factories.auth_header(admin_user)


@pytest.fixture
def milk(db_session: Session) -> Product:
    return factories.make_product(db_session, name="Cow Milk", price="60.00")


def add_boy(client: TestClient, headers: dict, name: str, phone: str, **extra) -> dict:
    response = client.post(
        URL, json={"name": name, "phone": phone, **extra}, headers=headers
    )
    assert response.status_code == 201, response.text
    return response.json()


def add_area(
    client: TestClient, headers: dict, boy: dict, pincode: str, name: str | None = None
):
    return client.post(
        f"{URL}/{boy['delivery_boy_id']}/areas",
        json={"pincode": pincode, "area_name": name},
        headers=headers,
    )


def order_in(client: TestClient, db: Session, product: Product, pincode: str) -> int:
    """A one-time order today by a new user whose default address has this PIN code."""
    user = factories.make_user(db, with_address=False)
    factories.make_address(db, user, pincode=pincode, is_default=True)
    response = client.post(
        "/api/v1/orders",
        json={
            "customer": {"name": user.full_name, "phone": f"9{user.user_id:09d}"[-10:]},
            "items": [{"product_id": product.product_id, "quantity": 2}],
        },
        headers=factories.auth_header(user),
    )
    assert response.status_code == 201, response.text
    assert response.json()["delivery_address"].endswith(pincode)
    return response.json()["order_id"]


# ---- access ----


@pytest.mark.parametrize(
    ("method", "path"),
    [("GET", URL), ("POST", URL), ("PATCH", f"{URL}/1"), ("DELETE", f"{URL}/1")],
)
def test_admin_only(
    client: TestClient, normal_user: User, method: str, path: str
) -> None:
    assert client.request(method, path, json={}).status_code == 401
    user = factories.auth_header(normal_user)
    assert client.request(method, path, json={}, headers=user).status_code == 403


# ---- delivery boys ----


def test_add_edit_and_delete_a_delivery_boy(client: TestClient, as_admin) -> None:
    boy = add_boy(client, as_admin, "  Ravi Kumar ", "9876500001")
    assert boy["name"] == "Ravi Kumar"
    assert (boy["is_active"], boy["areas"], boy["today_orders"]) == (True, [], 0)

    url = f"{URL}/{boy['delivery_boy_id']}"
    edited = client.patch(
        url, json={"is_active": False, "name": "Ravi K"}, headers=as_admin
    )
    assert edited.status_code == 200
    assert (edited.json()["name"], edited.json()["is_active"]) == ("Ravi K", False)

    assert client.delete(url, headers=as_admin).status_code == 204
    assert (
        client.patch(url, json={"name": "Ghost"}, headers=as_admin).status_code == 404
    )


@pytest.mark.parametrize(
    "body",
    [
        {"name": "Ravi", "phone": "5876500001"},
        {"name": "Ravi", "phone": "98765"},
        {"name": "R", "phone": "9876500001"},
        {"name": "Ravi", "phone": "9876500001", "extra": 1},
    ],
)
def test_invalid_delivery_boys(client: TestClient, as_admin, body: dict) -> None:
    assert client.post(URL, json=body, headers=as_admin).status_code == 422


def test_phone_must_be_unique(client: TestClient, as_admin) -> None:
    add_boy(client, as_admin, "Ravi", "9876500001")
    response = client.post(
        URL, json={"name": "Other", "phone": "9876500001"}, headers=as_admin
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "DELIVERY_BOY_ALREADY_EXISTS"


# ---- areas ----


def test_allocate_and_remove_areas(client: TestClient, as_admin) -> None:
    boy = add_boy(client, as_admin, "Ravi", "9876500001")

    added = add_area(client, as_admin, boy, "500034", "Banjara Hills")
    add_area(client, as_admin, boy, "500016", "")

    assert added.status_code == 200
    listed = client.get(URL, headers=as_admin).json()
    mine = next(b for b in listed if b["delivery_boy_id"] == boy["delivery_boy_id"])
    assert mine["areas"] == [
        {"pincode": "500016", "area_name": None},  # sorted by PIN code
        {"pincode": "500034", "area_name": "Banjara Hills"},
    ]

    removed = client.delete(
        f"{URL}/{boy['delivery_boy_id']}/areas/500016", headers=as_admin
    )
    assert removed.status_code == 200
    assert [a["pincode"] for a in removed.json()["areas"]] == ["500034"]
    again = client.delete(
        f"{URL}/{boy['delivery_boy_id']}/areas/500016", headers=as_admin
    )
    assert again.status_code == 404


def test_one_delivery_boy_per_pin_code(client: TestClient, as_admin) -> None:
    ravi = add_boy(client, as_admin, "Ravi Kumar", "9876500001")
    suresh = add_boy(client, as_admin, "Suresh", "9876500002")
    add_area(client, as_admin, ravi, "500016")

    taken = add_area(client, as_admin, suresh, "500016")
    twice = add_area(client, as_admin, ravi, "500016")

    assert taken.status_code == 409
    assert taken.json()["error"]["code"] == "AREA_ALREADY_ALLOCATED"
    assert "Ravi Kumar" in taken.json()["error"]["message"]
    assert twice.status_code == 409


def test_bad_pin_code(client: TestClient, as_admin) -> None:
    boy = add_boy(client, as_admin, "Ravi", "9876500001")
    assert add_area(client, as_admin, boy, "050016").status_code == 422
    assert add_area(client, as_admin, boy, "50001").status_code == 422


def test_deleting_a_delivery_boy_frees_his_areas(client: TestClient, as_admin) -> None:
    ravi = add_boy(client, as_admin, "Ravi", "9876500001")
    add_area(client, as_admin, ravi, "500016")
    client.delete(f"{URL}/{ravi['delivery_boy_id']}", headers=as_admin)

    suresh = add_boy(client, as_admin, "Suresh", "9876500002")
    assert add_area(client, as_admin, suresh, "500016").status_code == 200


# ---- orders keep the PIN code; deliveries are matched by it ----


def test_deliveries_are_matched_filtered_and_counted(
    client: TestClient, db_session: Session, milk: Product, as_admin
) -> None:
    ravi = add_boy(client, as_admin, "Ravi", "9876500001")
    suresh = add_boy(client, as_admin, "Suresh", "9876500002")
    add_area(client, as_admin, ravi, "500016")
    add_area(client, as_admin, suresh, "500081")
    r1 = order_in(client, db_session, milk, "500016")
    r2 = order_in(client, db_session, milk, "500016")
    s1 = order_in(client, db_session, milk, "500081")
    nobody = order_in(client, db_session, milk, "560001")

    day = client.get(DELIVERIES, headers=as_admin).json()
    by_id = {row["order_id"]: row for row in day["deliveries"]}
    assert by_id[r1]["delivery_boy"]["name"] == "Ravi"
    assert by_id[r1]["delivery_pincode"] == "500016"
    assert by_id[s1]["delivery_boy"]["name"] == "Suresh"
    assert by_id[nobody]["delivery_boy"] is None
    counts = {c["name"]: c["orders"] for c in day["boy_counts"]}
    assert (counts["Ravi"], counts["Suresh"]) == (2, 1)
    assert day["unassigned_count"] >= 1

    only_ravi = client.get(
        DELIVERIES, params={"boy": ravi["delivery_boy_id"]}, headers=as_admin
    ).json()
    assert {r["order_id"] for r in only_ravi["deliveries"]} == {r1, r2}
    # The van load is Ravi's only: 2 orders × 2 bottles.
    assert [
        (t["product_name"], t["quantity"]) for t in only_ravi["product_totals"]
    ] == [("Cow Milk", 4)]
    assert only_ravi["boy_counts"] == day["boy_counts"]  # counts ignore the filter

    unassigned = client.get(
        DELIVERIES, params={"boy": "unassigned"}, headers=as_admin
    ).json()
    assert nobody in {r["order_id"] for r in unassigned["deliveries"]}
    assert r1 not in {r["order_id"] for r in unassigned["deliveries"]}

    listed = client.get(URL, headers=as_admin).json()
    today = {b["name"]: b["today_orders"] for b in listed}
    assert (today["Ravi"], today["Suresh"]) == (2, 1)


def test_inactive_delivery_boy_orders_are_not_assigned(
    client: TestClient, db_session: Session, milk: Product, as_admin
) -> None:
    ravi = add_boy(client, as_admin, "Ravi", "9876500001")
    add_area(client, as_admin, ravi, "500016")
    order_id = order_in(client, db_session, milk, "500016")
    client.patch(
        f"{URL}/{ravi['delivery_boy_id']}", json={"is_active": False}, headers=as_admin
    )

    day = client.get(DELIVERIES, headers=as_admin).json()

    row = next(r for r in day["deliveries"] if r["order_id"] == order_id)
    assert row["delivery_boy"] is None
    assert "Ravi" not in {c["name"] for c in day["boy_counts"]}


def test_moving_an_area_moves_its_orders(
    client: TestClient, db_session: Session, milk: Product, as_admin
) -> None:
    ravi = add_boy(client, as_admin, "Ravi", "9876500001")
    suresh = add_boy(client, as_admin, "Suresh", "9876500002")
    add_area(client, as_admin, ravi, "500016")
    order_id = order_in(client, db_session, milk, "500016")

    client.delete(f"{URL}/{ravi['delivery_boy_id']}/areas/500016", headers=as_admin)
    add_area(client, as_admin, suresh, "500016")

    day = client.get(DELIVERIES, headers=as_admin).json()
    row = next(r for r in day["deliveries"] if r["order_id"] == order_id)
    assert row["delivery_boy"]["name"] == "Suresh"


def test_bad_boy_filter(client: TestClient, as_admin) -> None:
    for value in ["abc", "0", "-1"]:
        response = client.get(DELIVERIES, params={"boy": value}, headers=as_admin)
        assert response.status_code == 422, value


def test_migration_reads_the_pin_code_from_the_address_text(
    db_session: Session,
) -> None:
    """The backfill in migration 99af8de2905d uses this expression."""
    sql = text("SELECT substring(:address from '([1-9][0-9]{5})$')")
    found = db_session.scalar(
        sql, {"address": "12-3 Sai Residency, MG Road, Hyderabad - 500016"}
    )
    assert found == "500016"
