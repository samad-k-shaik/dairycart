"""API tests for sign-up, login, /me and admin-only access (#89)."""

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
    "email": "Ravi.Kumar@Example.com",
    "username": "Ravi_K",
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
    assert body["username"] == "ravi_k"  # stored in lower case
    assert body["email"] == "ravi.kumar@example.com"
    assert body["role"] == "USER"  # always USER
    assert set(body) == {
        "user_id",
        "full_name",
        "email",
        "username",
        "role",
        "created_at",
    }
    saved = db_session.scalars(select(User)).one()
    assert saved.password_hash != "milk1234"  # never the plain password
    assert saved.password_hash.startswith("$2b$")  # a bcrypt hash
    assert security.verify_password("milk1234", saved.password_hash)


def test_register_cannot_choose_the_admin_role(client: TestClient) -> None:
    response = client.post(REGISTER, json=NEW_USER | {"role": "ADMIN"})

    assert response.status_code == 422  # unknown field "role" is refused


@pytest.mark.parametrize(
    ("change", "field"),
    [
        ({"full_name": "A"}, "full_name"),
        ({"email": "not-an-email"}, "email"),
        ({"email": "a@b"}, "email"),
        ({"username": "ab"}, "username"),
        ({"username": "has space"}, "username"),
        ({"username": "x" * 31}, "username"),
        ({"password": "short1"}, "password"),
        ({"password": "onlyletters"}, "password"),
        ({"password": "12345678"}, "password"),
        ({"password": "a1" + "é" * 40}, "password"),  # 82 bytes > bcrypt's 72
    ],
)
def test_register_validates_fields(
    client: TestClient, change: dict, field: str
) -> None:
    response = client.post(REGISTER, json=NEW_USER | change)

    assert response.status_code == 422
    assert field in fields(response)


@pytest.mark.parametrize("missing", ["full_name", "email", "username", "password"])
def test_register_requires_every_field(client: TestClient, missing: str) -> None:
    body = {k: v for k, v in NEW_USER.items() if k != missing}

    assert client.post(REGISTER, json=body).status_code == 422


@pytest.mark.parametrize(
    ("change", "field"),
    [
        ({"username": "someone_else"}, "email"),  # same email, other username
        ({"email": "other@example.com"}, "username"),  # same username, other email
    ],
)
def test_duplicate_email_or_username_is_409(
    client: TestClient, db_session: Session, change: dict, field: str
) -> None:
    client.post(REGISTER, json=NEW_USER)

    response = client.post(REGISTER, json=NEW_USER | change)

    assert response.status_code == 409
    assert code(response) == "USER_ALREADY_EXISTS"
    assert fields(response) == {field}
    assert len(db_session.scalars(select(User)).all()) == 1


def test_duplicates_ignore_letter_case(client: TestClient) -> None:
    client.post(REGISTER, json=NEW_USER)

    response = client.post(
        REGISTER,
        json=NEW_USER | {"email": "RAVI.kumar@example.COM", "username": "RAVI_K"},
    )

    assert response.status_code == 409
    assert fields(response) == {"email", "username"}


# ---- login ----


@pytest.mark.parametrize("login", ["ravi_k", "RAVI_K", "ravi.kumar@example.com"])
def test_new_user_can_log_in_with_username_or_email(
    client: TestClient, login: str
) -> None:
    client.post(REGISTER, json=NEW_USER)

    response = client.post(LOGIN, json={"login": login, "password": "milk1234"})

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["expires_in"] == 60 * 60
    assert body["user"]["username"] == "ravi_k"
    me = client.get(ME, headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.json()["username"] == "ravi_k"


@pytest.mark.parametrize(
    "credentials",
    [
        {"login": "ravi_k", "password": "wrong1234"},  # wrong password
        {"login": "nobody", "password": "milk1234"},  # unknown user
    ],
)
def test_invalid_credentials_get_the_same_401(
    client: TestClient, credentials: dict
) -> None:
    client.post(REGISTER, json=NEW_USER)

    response = client.post(LOGIN, json=credentials)

    assert response.status_code == 401
    assert code(response) == "UNAUTHORIZED"
    # Same message either way, so nobody can find out which usernames exist.
    assert response.json()["error"]["message"] == "Invalid username/email or password."
    assert response.headers["WWW-Authenticate"] == "Bearer"


def test_login_needs_both_fields(client: TestClient) -> None:
    assert client.post(LOGIN, json={"login": "ravi_k"}).status_code == 422


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


def test_token_of_a_deleted_user_is_401(
    client: TestClient, db_session: Session
) -> None:
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
def test_admin_apis_refuse_anonymous_requests(
    client: TestClient, method: str, url: str
) -> None:
    response = client.request(method, url, json={})

    assert response.status_code == 401


@pytest.mark.parametrize(("method", "url"), ADMIN_CALLS)
def test_admin_apis_refuse_normal_users(
    client: TestClient, normal_user: User, method: str, url: str
) -> None:
    response = client.request(
        method, url, json={}, headers=factories.auth_header(normal_user)
    )

    assert response.status_code == 403
    assert code(response) == "FORBIDDEN"
    assert response.json()["error"]["message"] == "Only administrators can do this."


def test_admin_sees_all_users_without_password_hashes(
    client: TestClient, admin_user: User, normal_user: User
) -> None:
    response = client.get(
        "/api/v1/admin/users", headers=factories.auth_header(admin_user)
    )

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
