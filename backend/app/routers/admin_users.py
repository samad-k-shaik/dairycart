"""Admin users (#89, #101):

    GET /api/v1/admin/users                  → every registered user
    GET /api/v1/admin/users/{user_id}        → one user + order count and amount (#101)
    GET /api/v1/admin/users/{user_id}/orders → all of that user's orders (#101)

Like every /admin router it needs an ADMIN token (401 without one, 403 for a USER).
"""

from dataclasses import asdict
from typing import Annotated

from fastapi import APIRouter, Depends, Path
from sqlalchemy.orm import Session

from app.core.auth import require_admin
from app.database.session import get_db
from app.schemas.auth import AdminUserDetail, UserRead
from app.schemas.common import ErrorResponse
from app.schemas.order import OrderSummary
from app.services import auth_service, user_service

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


DbSession = Annotated[Session, Depends(get_db)]
UserId = Annotated[int, Path(gt=0, description="A positive user id")]
NOT_FOUND = {404: {"model": ErrorResponse, "description": "No user with this id"}}


@router.get(
    "/{user_id}",
    response_model=AdminUserDetail,
    summary="One user with order totals",
    responses=NOT_FOUND,
)
def get_user(user_id: UserId, db: DbSession) -> AdminUserDetail:
    """`total_spent` leaves out cancelled orders."""
    summary = user_service.get_user_summary(db, user_id)
    return AdminUserDetail(
        **UserRead.model_validate(summary.user).model_dump(),
        order_count=summary.order_count,
        total_spent=summary.total_spent,
    )


@router.get(
    "/{user_id}/orders",
    response_model=list[OrderSummary],
    summary="All orders of one user",
    responses=NOT_FOUND,
)
def list_user_orders(user_id: UserId, db: DbSession) -> list[OrderSummary]:
    """Newest first, the same rows the user sees in My orders."""
    rows = user_service.list_user_orders(db, user_id)
    return [OrderSummary.model_validate(asdict(row)) for row in rows]
