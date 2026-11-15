"""Sign-up, login and user lookups (#89)."""

from collections.abc import Sequence

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import UnauthorizedError, UserAlreadyExistsError
from app.core.security import create_access_token, hash_password, verify_password
from app.models import User, UserRole
from app.repositories.user_repository import UserRepository
from app.schemas.auth import RegisterRequest
from app.schemas.common import ErrorDetail

# One message for "no such user" AND "wrong password": telling them apart would let
# anyone find out which mobile numbers have an account.
INVALID_LOGIN_MESSAGE = "Invalid mobile number or password."
ALREADY_REGISTERED_MESSAGE = "An account with this mobile number already exists."


def register(db: Session, data: RegisterRequest) -> User:
    """Create a USER account. Mobile number already used → 409 USER_ALREADY_EXISTS.

    The role is always USER here; ADMIN is only given by `python -m app.scripts.create_admin`.
    """
    repository = UserRepository(db)
    if repository.phone_taken(data.phone):
        raise UserAlreadyExistsError(
            ALREADY_REGISTERED_MESSAGE,
            details=[ErrorDetail(field="phone", issue="already registered")],
        )

    try:
        user = repository.add(
            User(
                full_name=data.full_name,
                phone=data.phone,
                password_hash=hash_password(data.password),
                role=UserRole.USER,
            )
        )
        db.commit()
    except IntegrityError as error:
        # Two sign-ups with the same number at the same moment: the database's UNIQUE
        # constraint catches the second one.
        db.rollback()
        raise UserAlreadyExistsError(ALREADY_REGISTERED_MESSAGE) from error
    db.refresh(user)
    return user


def login(db: Session, phone: str, password: str) -> tuple[str, int, User]:
    """Check the credentials. Returns (token, expires_in_seconds, user) or raises 401."""
    user = UserRepository(db).get_by_phone(phone)
    # Always check a password, even for an unknown user (see verify_password), so the
    # answer takes the same time either way.
    password_ok = verify_password(password, user.password_hash if user else None)
    if user is None or not password_ok:
        raise UnauthorizedError(INVALID_LOGIN_MESSAGE)
    token, expires_in = create_access_token(user.user_id, user.role.value)
    return token, expires_in, user


def list_users(db: Session) -> Sequence[User]:
    return UserRepository(db).list_all()
