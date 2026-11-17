"""Delivery boy login and his own pages (#109).

The admin gives a delivery boy a login (his mobile number + a password); he then sees
only the orders in his areas and can mark them out for delivery or delivered."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import DeliveryArea, DeliveryBoy, Order, OrderStatus, User, UserRole
from tests import factories

ADMIN_BOYS = "/api/v1/admin/delivery-boys"
LOGIN = "/api/v1/auth/login"
ME = "/api/v1/delivery/me"
MY_ORDERS = "/api/v1/delivery/me/orders"
PASSWORD = "deliver123"


@pytest.fixture
def as_admin(admin_user: User) -> dict[str, str]:
    return factories.auth_header(admin_user)


@pytest.fixture
def ravi(db_session: Session) -> DeliveryBoy:
    """An active delivery boy covering Ameerpet (500016), no login yet."""
    boy = DeliveryBoy(name="Ravi Kumar", phone="9876500001")
    boy.areas.append(DeliveryArea(pincode="500016", area_name="Ameerpet"))
    db_session.add(boy)
    db_session.flush()
    return boy


def set_login(client: TestClient, headers: dict, boy: DeliveryBoy, password: str = PASSWORD):
    return client.put(
        f"{ADMIN_BOYS}/{boy.delivery_boy_id}/login", json={"password": password}, headers=headers
    )


def log_in(client: TestClient, phone: str, password: str = PASSWORD):
    return client.post(LOGIN, json={"phone": phone, "password": password})


def token_header(client: TestClient, phone: str) -> dict[str, str]:
    response = log_in(client, phone)
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def order_for(db: Session, pincode: str, status: OrderStatus = OrderStatus.PLACED) -> Order:
    """A one-time order placed today, delivered to `pincode`."""
    order = factories.make_order(db, status=status)
    order.delivery_address = f"1-2 Test Street, Hyderabad - {pincode}"
    order.delivery_pincode = pincode
    db.flush()
    return order


# ---- the admin gives him a login ----


def test_admin_creates_a_login_with_his_mobile_number(
    client: TestClient, db_session: Session, as_admin, ravi: DeliveryBoy
) -> None:
    response = set_login(client, as_admin, ravi)

    assert response.status_code == 200
    assert response.json()["has_login"] is True
    db_session.refresh(ravi)
    assert ravi.user is not None
    assert (ravi.user.phone, ravi.user.role, ravi.user.full_name) == (
        "9876500001",
        UserRole.DELIVERY_BOY,
        "Ravi Kumar",
    )
    assert "password" not in response.text  # never returned
    logged_in = log_in(client, "9876500001")
    assert logged_in.status_code == 200
    assert logged_in.json()["user"]["role"] == "DELIVERY_BOY"


def test_list_shows_who_has_a_login(client: TestClient, as_admin, ravi: DeliveryBoy) -> None:
    [before] = client.get(ADMIN_BOYS, headers=as_admin).json()
    set_login(client, as_admin, ravi)
    [after] = client.get(ADMIN_BOYS, headers=as_admin).json()
    assert (before["has_login"], after["has_login"]) == (False, True)


def test_setting_it_again_changes_the_password(
    client: TestClient, as_admin, ravi: DeliveryBoy
) -> None:
    set_login(client, as_admin, ravi)
    assert set_login(client, as_admin, ravi, "newpass456").status_code == 200

    assert log_in(client, "9876500001").status_code == 401  # old password
    assert log_in(client, "9876500001", "newpass456").status_code == 200


def test_a_customers_number_is_never_taken_over(
    client: TestClient, db_session: Session, as_admin, ravi: DeliveryBoy
) -> None:
    factories.make_user(db_session, phone="9876500001")  # a customer already uses it

    response = set_login(client, as_admin, ravi)

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "USER_ALREADY_EXISTS"


@pytest.mark.parametrize("password", ["short1", "lettersonly", "12345678"])
def test_password_rules_apply(client: TestClient, as_admin, ravi: DeliveryBoy, password) -> None:
    assert set_login(client, as_admin, ravi, password).status_code == 422


def test_only_admins_can_set_a_login(
    client: TestClient, db_session: Session, ravi: DeliveryBoy
) -> None:
    customer = factories.auth_header(factories.make_user(db_session))
    assert set_login(client, {}, ravi).status_code == 401
    assert set_login(client, customer, ravi).status_code == 403


def test_editing_his_number_moves_his_login(
    client: TestClient, as_admin, ravi: DeliveryBoy
) -> None:
    set_login(client, as_admin, ravi)

    edited = client.patch(
        f"{ADMIN_BOYS}/{ravi.delivery_boy_id}", json={"phone": "9876500002"}, headers=as_admin
    )

    assert edited.status_code == 200
    assert log_in(client, "9876500001").status_code == 401
    assert log_in(client, "9876500002").status_code == 200


def test_deleting_him_deletes_his_login(client: TestClient, as_admin, ravi: DeliveryBoy) -> None:
    set_login(client, as_admin, ravi)

    client.delete(f"{ADMIN_BOYS}/{ravi.delivery_boy_id}", headers=as_admin)

    assert log_in(client, "9876500001").status_code == 401


# ---- switched off ----


def test_a_switched_off_delivery_boy_cannot_log_in(
    client: TestClient, as_admin, ravi: DeliveryBoy
) -> None:
    set_login(client, as_admin, ravi)
    client.patch(
        f"{ADMIN_BOYS}/{ravi.delivery_boy_id}", json={"is_active": False}, headers=as_admin
    )

    response = log_in(client, "9876500001")

    assert response.status_code == 403
    assert "switched off" in response.json()["error"]["message"]


def test_switching_him_off_ends_access_at_once(
    client: TestClient, as_admin, ravi: DeliveryBoy
) -> None:
    set_login(client, as_admin, ravi)
    headers = token_header(client, "9876500001")
    assert client.get(ME, headers=headers).status_code == 200

    client.patch(
        f"{ADMIN_BOYS}/{ravi.delivery_boy_id}", json={"is_active": False}, headers=as_admin
    )

    assert client.get(ME, headers=headers).status_code == 403  # same token, refused now


# ---- his pages ----


def test_me_shows_his_record_and_areas(client: TestClient, as_admin, ravi: DeliveryBoy) -> None:
    set_login(client, as_admin, ravi)
    me = client.get(ME, headers=token_header(client, "9876500001")).json()
    assert me["name"] == "Ravi Kumar"
    assert me["areas"] == [{"pincode": "500016", "area_name": "Ameerpet"}]


def test_only_delivery_boys_can_use_the_delivery_pages(
    client: TestClient, db_session: Session, as_admin
) -> None:
    customer = factories.auth_header(factories.make_user(db_session))
    assert client.get(ME).status_code == 401
    assert client.get(ME, headers=customer).status_code == 403
    assert client.get(MY_ORDERS, headers=as_admin).status_code == 403


def test_he_sees_only_todays_orders_in_his_areas(
    client: TestClient, db_session: Session, as_admin, ravi: DeliveryBoy
) -> None:
    set_login(client, as_admin, ravi)
    mine = order_for(db_session, "500016")
    order_for(db_session, "500081")  # another area
    order_for(db_session, "500016", OrderStatus.CANCELLED)  # cancelled: not to deliver

    orders = client.get(MY_ORDERS, headers=token_header(client, "9876500001")).json()

    assert [o["order_id"] for o in orders] == [mine.order_id]
    [order] = orders
    assert order["delivery_pincode"] == "500016"
    assert order["customer_phone"] == mine.customer.phone  # to call at the door
    assert order["items"][0]["quantity"] == 1
    assert "unit_price" not in order["items"][0]


def test_another_day_has_its_own_list(
    client: TestClient, db_session: Session, as_admin, ravi: DeliveryBoy
) -> None:
    set_login(client, as_admin, ravi)
    order_for(db_session, "500016")  # placed today
    headers = token_header(client, "9876500001")

    assert client.get(MY_ORDERS, params={"date": "2020-01-01"}, headers=headers).json() == []
    assert client.get(MY_ORDERS, params={"date": "not-a-day"}, headers=headers).status_code == 422


def test_he_marks_an_order_out_for_delivery_then_delivered(
    client: TestClient, db_session: Session, as_admin, ravi: DeliveryBoy
) -> None:
    set_login(client, as_admin, ravi)
    order = order_for(db_session, "500016", OrderStatus.CONFIRMED)
    headers = token_header(client, "9876500001")
    url = f"{MY_ORDERS}/{order.order_id}/status"

    out = client.patch(url, json={"status": "OUT_FOR_DELIVERY"}, headers=headers)
    done = client.patch(url, json={"status": "DELIVERED"}, headers=headers)

    assert (out.status_code, out.json()["status"]) == (200, "OUT_FOR_DELIVERY")
    assert (done.status_code, done.json()["status"]) == (200, "DELIVERED")


def test_status_rules_for_delivery_boys(
    client: TestClient, db_session: Session, as_admin, ravi: DeliveryBoy
) -> None:
    set_login(client, as_admin, ravi)
    headers = token_header(client, "9876500001")
    placed = order_for(db_session, "500016")  # not confirmed yet
    elsewhere = order_for(db_session, "500081", OrderStatus.CONFIRMED)

    def patch(order: Order, status: str):
        return client.patch(
            f"{MY_ORDERS}/{order.order_id}/status", json={"status": status}, headers=headers
        )

    # Confirming and cancelling stay with the admin.
    assert patch(placed, "CONFIRMED").status_code == 422
    assert patch(placed, "CANCELLED").status_code == 422
    # The normal transition rules apply: PLACED cannot jump to OUT_FOR_DELIVERY.
    assert patch(placed, "OUT_FOR_DELIVERY").status_code == 409
    # Another area's order is invisible to him.
    assert patch(elsewhere, "OUT_FOR_DELIVERY").status_code == 404
