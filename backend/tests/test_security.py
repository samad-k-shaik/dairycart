"""Password hashing and JWT tests (#89)."""

from datetime import UTC, datetime, timedelta

import jwt
import pytest
from sqlalchemy.orm import Session

from app.core import security
from app.core.config import get_settings
from app.models import UserRole
from app.repositories.user_repository import UserRepository
from app.schemas.auth import RegisterRequest
from app.scripts.create_admin import create_admin, promote
from tests import factories

# ---- passwords ----


def test_hash_is_salted_and_verifiable() -> None:
    first = security.hash_password("milk1234")
    second = security.hash_password("milk1234")

    assert first != second  # random salt: same password, different hashes
    assert security.verify_password("milk1234", first)
    assert security.verify_password("milk1234", second)
    assert not security.verify_password("milk12345", first)
    assert not security.verify_password("MILK1234", first)


def test_unknown_user_check_returns_false() -> None:
    assert security.verify_password("anything1", None) is False


def test_production_cost_is_12() -> None:
    # Tests lower BCRYPT_ROUNDS for speed (conftest); the real default must stay 12.
    hashed = security._DUMMY_HASH.decode()
    assert hashed.startswith("$2b$12$")


# ---- tokens ----


def test_token_round_trip() -> None:
    token, expires_in = security.create_access_token(42, "USER")

    assert security.read_access_token(token) == 42
    assert expires_in == get_settings().jwt_expire_minutes * 60
    claims = jwt.decode(token, options={"verify_signature": False})
    assert claims["sub"] == "42" and claims["role"] == "USER"


def test_expired_token_is_rejected() -> None:
    long_ago = datetime.now(UTC) - timedelta(days=1)
    token, _ = security.create_access_token(42, "USER", now=long_ago)

    assert security.read_access_token(token) is None


def test_tampered_token_is_rejected() -> None:
    token, _ = security.create_access_token(42, "USER")
    header, _original_payload, signature = token.split(".")
    other_payload = security.create_access_token(1, "ADMIN")[0].split(".")[1]

    assert security.read_access_token(f"{header}.{other_payload}.{signature}") is None


def test_token_signed_with_another_secret_is_rejected() -> None:
    forged = jwt.encode(
        {"sub": "1", "exp": datetime.now(UTC) + timedelta(hours=1)},
        "someone-elses-secret-that-is-long-enough!!",
        algorithm="HS256",
    )

    assert security.read_access_token(forged) is None


def test_unsigned_none_algorithm_token_is_rejected() -> None:
    unsigned = jwt.encode(
        {"sub": "1", "exp": datetime.now(UTC) + timedelta(hours=1)},
        key=None,
        algorithm="none",
    )

    assert security.read_access_token(unsigned) is None


@pytest.mark.parametrize(
    "claims", [{"sub": "1"}, {"exp": 9999999999}, {"sub": "x", "exp": 9999999999}]
)
def test_token_without_expiry_or_valid_subject_is_rejected(claims: dict) -> None:
    token = jwt.encode(
        claims, get_settings().jwt_secret_key.get_secret_value(), algorithm="HS256"
    )

    assert security.read_access_token(token) is None


# ---- create_admin script (the only way to get ADMIN) ----


def test_create_admin_makes_an_admin(db_session: Session) -> None:
    data = RegisterRequest(
        full_name="Dairy Admin",
        email="admin@dairycart.local",
        username="admin",
        password="secret123",
    )

    user = create_admin(db_session, data)

    assert user.role == UserRole.ADMIN
    assert security.verify_password("secret123", user.password_hash)


def test_create_admin_refuses_an_existing_username(db_session: Session) -> None:
    factories.make_user(db_session, username="admin")
    data = RegisterRequest(
        full_name="Dairy Admin",
        email="new@x.com",
        username="admin",
        password="secret123",
    )

    with pytest.raises(ValueError, match="--promote"):
        create_admin(db_session, data)


def test_promote_existing_user(db_session: Session) -> None:
    user = factories.make_user(db_session, username="ravi")

    promote(db_session, "RAVI")

    assert UserRepository(db_session).get(user.user_id).role == UserRole.ADMIN


def test_promote_unknown_user(db_session: Session) -> None:
    with pytest.raises(LookupError):
        promote(db_session, "nobody")
