"""FastAPI dependencies that protect endpoints (#89).

    def me(user: CurrentUser): ...                         → 401 without a valid token
    router = APIRouter(dependencies=[Depends(require_admin)])  → 401, or 403 for a USER

How it works: the client sends `Authorization: Bearer <token>`. We check the token's
signature and expiry, then load the user from the DATABASE. The role is taken from the
database, not from the token, so an admin who is demoted loses access immediately.
"""

from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.errors import ForbiddenError, UnauthorizedError
from app.core.security import read_access_token
from app.database.session import get_db
from app.models import User, UserRole
from app.repositories.user_repository import UserRepository

# auto_error=False: we raise our own 401 in the project's error format.
# It also adds the "Authorize" button to /docs.
_bearer = HTTPBearer(auto_error=False, description="Token from POST /auth/login")


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    if credentials is None:
        raise UnauthorizedError("Please log in to continue.")
    user_id = read_access_token(credentials.credentials)
    user = UserRepository(db).get(user_id) if user_id is not None else None
    if user is None:  # bad signature, expired, or the user no longer exists
        raise UnauthorizedError(
            "Your session is invalid or has expired. Please log in again."
        )
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_admin(user: CurrentUser) -> User:
    if user.role != UserRole.ADMIN:
        raise ForbiddenError("Only administrators can do this.")
    return user
