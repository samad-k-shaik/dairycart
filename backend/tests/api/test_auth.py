"""API tests for sign-up, login, /me and admin-only access (#89; mobile number login: #121)."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import security
from app.models import User, UserRole
from tests import factories

REGISTER = "/api/v1/auth/register"
LOGIN = "/api/v1/auth/login"
ME = "/api/v1/auth/me"
NEW_USER = {
    "full_name": "Ravi Kumar",
    "phone": "9876543210",
    "password": "milk1234",
}


def code(response) -> str:
    return response.json()["error"]["code"]


def fields(response) -> set[str]:
    return {d["field"] for d in response.json()["error"]["details"]}


# ---- register ----


def test_register_saves_a_user_with_a_hashed_password(
    client: TestClient, db_session: Session
) -> None:
    response = client.post(REGISTER, json=NEW_USER)

    assert response.status_code == 201
    body = response.json()
    assert body["full_name"] == "Ravi Kumar"
    assert body["phone"] == "9876543210"
    assert body["role"] == "USER"  # always USER
    # #121: no email or username any more.
    assert set(body) == {"user_id", "full_name", "phone", "role", "created_at"}
    saved = db_session.scalars(select(User)).one()
    assert saved.password_hash != "milk1234"  # never the plain password
    assert saved.password_hash.startswith("$2b$")  # a bcrypt hash
    assert security.verify_password("milk1234", saved.password_hash)


@pytest.mark.parametrize(
    "typed",
    [
        "9876543210",
        " 98765 43210 ",
        "+91 98765 43210",
        "+919876543210",
        "09876543210",
        "98765-43210",
    ],
)
def test_register_saves_the_mobile_number_as_10_digits(client: TestClient, typed: str) -> None:
    response = client.post(REGISTER, json=NEW_USER | {"phone": typed})

    assert response.status_code == 201
    assert response.json()["phone"] == "9876543210"


@pytest.mark.parametrize("extra", [{"role": "ADMIN"}, {"email": "a@b.com"}, {"username": "ravi"}])
def test_register_refuses_unknown_fields(client: TestClient, extra: dict) -> None:
    response = client.post(REGISTER, json=NEW_USER | extra)

    # "role" can never be chosen; email/username are gone since #121.
    assert response.status_code == 422


@pytest.mark.parametrize(
    ("change", "field"),
    [
        ({"full_name": "A"}, "full_name"),
        ({"full_name": "   "}, "full_name"),
        ({"phone": "987654321"}, "phone"),  # 9 digits
        ({"phone": "98765432101"}, "phone"),  # 11 digits, no leading 0
        ({"phone": "5876543210"}, "phone"),  # Indian mobiles start with 6-9
        ({"phone": "98765abcde"}, "phone"),
        ({"phone": "+44 7911 123456"}, "phone"),  # not an Indian number
        ({"phone": 9876543210}, "phone"),  # a JSON number, not text
        ({"password": "short1"}, "password"),
        ({"password": "onlyletters"}, "password"),
        ({"password": "12345678"}, "password"),
        ({"password": "a1" + "é" * 40}, "password"),  # 82 bytes > bcrypt's 72
    ],
)
def test_register_validates_fields(client: TestClient, change: dict, field: str) -> None:
    response = client.post(REGISTER, json=NEW_USER | change)

    assert response.status_code == 422
    assert field in fields(response)


@pytest.mark.parametrize("missing", ["full_name", "phone", "password"])
def test_register_requires_every_field(client: TestClient, missing: str) -> None:
    body = {k: v for k, v in NEW_USER.items() if k != missing}

    response = client.post(REGISTER, json=body)

    assert response.status_code == 422
    assert missing in fields(response)


@pytest.mark.parametrize("same_number", ["9876543210", "+91 98765 43210"])
def test_duplicate_mobile_number_is_409(
    client: TestClient, db_session: Session, same_number: str
) -> None:
    client.post(REGISTER, json=NEW_USER)

    response = client.post(
        REGISTER, json=NEW_USER | {"full_name": "Someone Else", "phone": same_number}
    )

    assert response.status_code == 409
    assert code(response) == "USER_ALREADY_EXISTS"
    assert fields(response) == {"phone"}
    assert len(db_session.scalars(select(User)).all()) == 1


def test_same_name_with_another_number_is_a_new_account(client: TestClient) -> None:
    client.post(REGISTER, json=NEW_USER)

    response = client.post(REGISTER, json=NEW_USER | {"phone": "9876500000"})

    assert response.status_code == 201  # names are not unique, numbers are


# ---- login ----


@pytest.mark.parametrize("typed", ["9876543210", "+91 98765 43210", "09876543210"])
def test_new_user_can_log_in_with_the_mobile_number(client: TestClient, typed: str) -> None:
    client.post(REGISTER, json=NEW_USER)

    response = client.post(LOGIN, json={"phone": typed, "password": "milk1234"})

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["expires_in"] == 60 * 60
    assert body["user"]["phone"] == "9876543210"
    me = client.get(ME, headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.json()["full_name"] == "Ravi Kumar"


@pytest.mark.parametrize(
    "credentials",
    [
        {"phone": "9876543210", "password": "wrong1234"},  # wrong password
        {"phone": "9000099999", "password": "milk1234"},  # number without an account
    ],
)
def test_invalid_credentials_get_the_same_401(client: TestClient, credentials: dict) -> None:
    client.post(REGISTER, json=NEW_USER)

    response = client.post(LOGIN, json=credentials)

    assert response.status_code == 401
    assert code(response) == "UNAUTHORIZED"
    # Same message either way, so nobody can find out which numbers have an account.
    assert response.json()["error"]["message"] == "Invalid mobile number or password."
    assert response.headers["WWW-Authenticate"] == "Bearer"


@pytest.mark.parametrize(
    "body",
    [
        {"phone": "9876543210"},  # no password
        {"password": "milk1234"},  # no phone
        {"phone": "12345", "password": "milk1234"},  # not a mobile number
        {"login": "ravi_k", "password": "milk1234"},  # the old (#89) login field
    ],
)
def test_login_needs_a_mobile_number_and_a_password(client: TestClient, body: dict) -> None:
    assert client.post(LOGIN, json=body).status_code == 422


# ---- /me and tokens ----


def test_me_without_a_token_is_401(client: TestClient) -> None:
    response = client.get(ME)

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Please log in to continue."


@pytest.mark.parametrize(
    "header",
    ["Bearer not-a-token", "Bearer ", "Basic dXNlcjpwYXNz", "token-without-scheme"],
)
def test_me_with_a_bad_token_is_401(client: TestClient, header: str) -> None:
    assert client.get(ME, headers={"Authorization": header}).status_code == 401


def test_token_of_a_deleted_user_is_401(client: TestClient, db_session: Session) -> None:
    user = factories.make_user(db_session)
    headers = factories.auth_header(user)
    db_session.delete(user)
    db_session.flush()

    assert client.get(ME, headers=headers).status_code == 401


# ---- admin-only access (every /admin API) ----

ADMIN_CALLS = [
    ("GET", "/api/v1/admin/users"),
    ("GET", "/api/v1/admin/orders"),
    ("PATCH", "/api/v1/admin/orders/1/status"),
    ("POST", "/api/v1/admin/products"),
    ("PATCH", "/api/v1/admin/products/1"),
    ("DELETE", "/api/v1/admin/products/1"),
]


@pytest.mark.parametrize(("method", "url"), ADMIN_CALLS)
def test_admin_apis_refuse_anonymous_requests(client: TestClient, method: str, url: str) -> None:
    response = client.request(method, url, json={})

    assert response.status_code == 401


@pytest.mark.parametrize(("method", "url"), ADMIN_CALLS)
def test_admin_apis_refuse_normal_users(
    client: TestClient, normal_user: User, method: str, url: str
) -> None:
    response = client.request(method, url, json={}, headers=factories.auth_header(normal_user))

    assert response.status_code == 403
    assert code(response) == "FORBIDDEN"
    assert response.json()["error"]["message"] == "Only administrators can do this."


def test_admin_sees_all_users_without_password_hashes(
    client: TestClient, admin_user: User, normal_user: User
) -> None:
    response = client.get("/api/v1/admin/users", headers=factories.auth_header(admin_user))

    assert response.status_code == 200
    users = response.json()
    assert [u["user_id"] for u in users] == [admin_user.user_id, normal_user.user_id]
    assert [u["role"] for u in users] == ["ADMIN", "USER"]
    assert all("password_hash" not in u and "password" not in u for u in users)


def test_demoted_admin_loses_access_at_once(
    client: TestClient, db_session: Session, admin_user: User
) -> None:
    headers = factories.auth_header(admin_user)  # token says ADMIN
    admin_user.role = UserRole.USER  # ...but the database now says USER
    db_session.flush()

    assert client.get("/api/v1/admin/users", headers=headers).status_code == 403


def test_public_pages_still_work_without_login(client: TestClient) -> None:
    assert client.get("/api/v1/products").status_code == 200
    assert client.get("/api/v1/health").status_code == 200
