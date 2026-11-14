"""Admin daily deliveries (#101). ADMIN only (401 without a token, 403 for a USER).

    GET /api/v1/admin/deliveries?date=YYYY-MM-DD   → the day's orders, product totals,
                                                     status counts (default: today, India)
        &boy=<delivery_boy_id> | unassigned         → only one delivery boy's orders (#103)

Status changes use the existing PATCH /api/v1/admin/orders/{id}/status.
"""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.auth import require_admin
from app.core.errors import InvalidFieldError
from app.database.session import get_db
from app.schemas.common import ErrorDetail, ErrorResponse
from app.schemas.delivery import DayDeliveries
from app.services import delivery_service
from app.services.subscription_service import today_ist

router = APIRouter(
    prefix="/admin/deliveries",
    tags=["admin deliveries"],
    dependencies=[Depends(require_admin)],
    responses={
        401: {"model": ErrorResponse, "description": "Not logged in"},
        403: {"model": ErrorResponse, "description": "Not an administrator"},
    },
)


@router.get(
    "",
    response_model=DayDeliveries,
    summary="Deliveries for one day",
    responses={422: {"model": ErrorResponse, "description": "Invalid date"}},
)
def list_deliveries(
    db: Annotated[Session, Depends(get_db)],
    day: Annotated[
        date | None,
        Query(alias="date", description="YYYY-MM-DD (default: today, India time)"),
    ] = None,
    boy: Annotated[
        str | None,
        Query(description="A delivery boy's id, or 'unassigned' (#103)"),
    ] = None,
) -> DayDeliveries:
    """Subscription orders for that day + one-time orders placed that day (India time),
    sorted by delivery time. Product totals skip cancelled orders."""
    return delivery_service.deliveries_for(db, day or today_ist(), _read_boy(boy))


def _read_boy(value: str | None) -> delivery_service.BoyFilter:
    """None, "unassigned", or a positive id; anything else → 422 on `boy`."""
    if value is None or value == "unassigned":
        return value
    if value.isdigit() and int(value) > 0:
        return int(value)
    raise InvalidFieldError(
        "boy must be a delivery boy's id or 'unassigned'.",
        details=[ErrorDetail(field="boy", issue="invalid")],
    )
