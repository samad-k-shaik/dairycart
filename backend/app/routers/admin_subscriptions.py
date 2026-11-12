"""Admin subscription endpoints (#97). ADMIN only (401 without a token, 403 for a USER).

GET  /api/v1/admin/subscriptions                   → all subscriptions (?status=)
POST /api/v1/admin/subscriptions/generate-orders   → create today's orders
"""

from dataclasses import asdict
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.auth import require_admin
from app.database.session import get_db
from app.models import SubscriptionStatus
from app.schemas.common import ErrorResponse
from app.schemas.subscription import (
    AdminSubscriptionSummary,
    GeneratedOrder,
    GenerateOrdersResult,
    SkippedSubscription,
)
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
) -> list[AdminSubscriptionSummary]:
    """Newest first."""
    rows = subscription_service.list_admin_subscriptions(db, status)
    return [AdminSubscriptionSummary(**asdict(row)) for row in rows]


@router.post(
    "/generate-orders",
    response_model=GenerateOrdersResult,
    summary="Create today's subscription orders",
)
def generate_orders(db: DbSession) -> GenerateOrdersResult:
    """One order per ACTIVE subscription for today (India time). Safe to press twice:
    a subscription never gets two orders for the same day."""
    result = subscription_service.generate_orders_for(
        db, subscription_service.today_ist()
    )
    return GenerateOrdersResult(
        delivery_date=result.delivery_date,
        created=[
            GeneratedOrder(subscription_id=s, order_id=o) for s, o in result.created
        ],
        already_created=result.already_created,
        skipped=[
            SkippedSubscription(subscription_id=s, reason=r) for s, r in result.skipped
        ],
        completed=result.completed,
    )
