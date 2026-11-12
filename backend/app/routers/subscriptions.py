"""Customer subscription endpoints (#97). Login required for all of them.

    POST /api/v1/subscriptions                    → subscribe (201 + Location header)
    GET  /api/v1/subscriptions/mine               → my subscriptions, newest first
    GET  /api/v1/subscriptions/{id}               → one subscription (owner or ADMIN)
    POST /api/v1/subscriptions/{id}/cancel        → cancel it (owner or ADMIN)

The rules are in services/subscription_service.py.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Path, Response, status
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser
from app.database.session import get_db
from app.models import Subscription
from app.schemas.common import ErrorResponse
from app.schemas.subscription import SubscriptionCreate, SubscriptionRead
from app.services import subscription_service

router = APIRouter(
    prefix="/subscriptions",
    tags=["subscriptions"],
    responses={401: {"model": ErrorResponse, "description": "Not logged in"}},
)

DbSession = Annotated[Session, Depends(get_db)]
SubscriptionId = Annotated[int, Path(gt=0, description="A positive subscription id")]


def _error(description: str) -> dict:
    return {"model": ErrorResponse, "description": description}


def _read(db: Session, subscription: Subscription) -> SubscriptionRead:
    count = subscription_service.order_count(db, subscription.subscription_id)
    return SubscriptionRead.from_subscription(subscription, count)


@router.post(
    "",
    response_model=SubscriptionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Subscribe (7, 15 or 30 days)",
    responses={
        400: _error("DUPLICATE_PRODUCT"),
        404: _error("NOT_FOUND: a product does not exist"),
        409: _error(
            "SUBSCRIPTION_ALREADY_ACTIVE, PRODUCT_UNAVAILABLE or INSUFFICIENT_STOCK"
        ),
        422: _error("Invalid body, start date out of range, or prices were sent"),
    },
)
def create_subscription(
    data: SubscriptionCreate, response: Response, db: DbSession, user: CurrentUser
) -> SubscriptionRead:
    """Send only the plan, start date, contact and product ids + quantities. The
    backend locks today's prices and calculates the daily and plan totals."""
    subscription = subscription_service.create_subscription(db, data, user)
    response.headers["Location"] = (
        f"/api/v1/subscriptions/{subscription.subscription_id}"
    )
    return _read(db, subscription)


# "/mine" before "/{subscription_id}", so "mine" is not read as an id.
@router.get("/mine", response_model=list[SubscriptionRead], summary="My subscriptions")
def list_my_subscriptions(db: DbSession, user: CurrentUser) -> list[SubscriptionRead]:
    return [
        SubscriptionRead.from_subscription(subscription, count)
        for subscription, count in subscription_service.list_my_subscriptions(db, user)
    ]


@router.get(
    "/{subscription_id}",
    response_model=SubscriptionRead,
    summary="Subscription details",
    responses={404: _error("No such subscription, or it belongs to someone else")},
)
def get_subscription(
    subscription_id: SubscriptionId, db: DbSession, user: CurrentUser
) -> SubscriptionRead:
    subscription = subscription_service.get_subscription_for(db, subscription_id, user)
    return _read(db, subscription)


@router.post(
    "/{subscription_id}/cancel",
    response_model=SubscriptionRead,
    summary="Cancel a subscription",
    responses={
        404: _error("No such subscription, or it belongs to someone else"),
        409: _error("SUBSCRIPTION_NOT_ACTIVE: already cancelled or completed"),
    },
)
def cancel_subscription(
    subscription_id: SubscriptionId, db: DbSession, user: CurrentUser
) -> SubscriptionRead:
    """No more orders from tomorrow on. An order already created for today stays."""
    subscription = subscription_service.cancel_subscription(db, subscription_id, user)
    return _read(db, subscription)
