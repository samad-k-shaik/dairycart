"""GET /api/v1/admin/users → every registered user, for the admin Users page (#89).

Like every /admin router it needs an ADMIN token (401 without one, 403 for a USER).
"""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import require_admin
from app.database.session import get_db
from app.schemas.auth import UserRead
from app.schemas.common import ErrorResponse
from app.services import auth_service

router = APIRouter(
    prefix="/admin/users",
    tags=["admin users"],
    dependencies=[Depends(require_admin)],
    responses={
        401: {"model": ErrorResponse, "description": "Not logged in"},
        403: {"model": ErrorResponse, "description": "Not an administrator"},
    },
)


@router.get("", response_model=list[UserRead], summary="All registered users")
def list_users(db: Annotated[Session, Depends(get_db)]) -> list[UserRead]:
    """Oldest first. Never includes password hashes."""
    return [UserRead.model_validate(user) for user in auth_service.list_users(db)]
