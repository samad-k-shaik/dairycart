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
# anyone find out which usernames and emails have an account.
INVALID_LOGIN_MESSAGE = "Invalid username/email or password."


def register(db: Session, data: RegisterRequest) -> User:
    """Create a USER account. Duplicate email or username → 409 USER_ALREADY_EXISTS.

    The role is always USER here; ADMIN is only given by `python -m app.scripts.create_admin`.
    """
    repository = UserRepository(db)
    problems = []
    if repository.email_taken(data.email):
        problems.append(ErrorDetail(field="email", issue="already registered"))
    if repository.username_taken(data.username):
        problems.append(ErrorDetail(field="username", issue="already taken"))
    if problems:
        raise UserAlreadyExistsError(
            "An account with this email or username already exists.", details=problems
        )

    try:
        user = repository.add(
            User(
                full_name=data.full_name,
                email=data.email,
                username=data.username,
                password_hash=hash_password(data.password),
                role=UserRole.USER,
            )
        )
        db.commit()
    except IntegrityError as error:
        # Two sign-ups with the same email/username at the same moment: the database's
        # UNIQUE constraint catches the second one.
        db.rollback()
        raise UserAlreadyExistsError(
            "An account with this email or username already exists."
        ) from error
    db.refresh(user)
    return user


def login(db: Session, login_name: str, password: str) -> tuple[str, int, User]:
    """Check the credentials. Returns (token, expires_in_seconds, user) or raises 401."""
    user = UserRepository(db).find_by_login(login_name)
    # Always check a password, even for an unknown user (see verify_password), so the
    # answer takes the same time either way.
    password_ok = verify_password(password, user.password_hash if user else None)
    if user is None or not password_ok:
        raise UnauthorizedError(INVALID_LOGIN_MESSAGE)
    token, expires_in = create_access_token(user.user_id, user.role.value)
    return token, expires_in, user


def list_users(db: Session) -> Sequence[User]:
    return UserRepository(db).list_all()
