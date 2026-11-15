"""Admin subscription endpoints (#97). ADMIN only (401 without a token, 403 for a USER).

GET  /api/v1/admin/subscriptions   → all subscriptions (?status=, ?user_id= #101)

#99: the "generate orders" endpoint and button were removed. Delivery orders are created
automatically by the backend (app/core/background.py); the script
app.scripts.generate_subscription_orders is the manual backup.
"""

from dataclasses import asdict
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.auth import require_admin
from app.database.session import get_db
from app.models import SubscriptionStatus
from app.schemas.common import ErrorResponse
from app.schemas.subscription import AdminSubscriptionSummary
from app.services import subscription_service

router = APIRouter(
    prefix="/admin/subscriptions",
    tags=["admin subscriptions"],
    dependencies=[Depends(require_admin)],
    responses={
        401: {"model": ErrorResponse, "description": "Not logged in"},
        403: {"model": ErrorResponse, "description": "Not an administrator"},
    },
)

DbSession = Annotated[Session, Depends(get_db)]


@router.get(
    "", response_model=list[AdminSubscriptionSummary], summary="All subscriptions"
)
def list_subscriptions(
    db: DbSession,
    status: Annotated[
        SubscriptionStatus | None, Query(description="Only this status")
    ] = None,
    user_id: Annotated[
        int | None, Query(gt=0, description="Only this user's subscriptions (#101)")
    ] = None,
) -> list[AdminSubscriptionSummary]:
    """Newest first."""
    rows = subscription_service.list_admin_subscriptions(db, status, user_id=user_id)
    return [AdminSubscriptionSummary(**asdict(row)) for row in rows]
