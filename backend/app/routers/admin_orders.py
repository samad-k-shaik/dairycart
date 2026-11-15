"""Admin order endpoints (M3-07):

    GET   /api/v1/admin/orders                     → one page of orders + status counts
          ?date=YYYY-MM-DD&boy=<id>|unassigned&q=…  → #104 Orders board filters
    PATCH /api/v1/admin/orders/{order_id}/status   → move an order to its next status

Protected (#89): every endpoint here needs an ADMIN token (401 without one, 403 for a USER).
"""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.orm import Session

from app.core.auth import require_admin
from app.core.errors import InvalidFieldError
from app.database.session import get_db
from app.models import OrderStatus
from app.repositories.order_repository import AdminOrderFilters
from app.schemas.common import ErrorDetail, ErrorResponse
from app.schemas.order import (
    AdminOrderPage,
    AdminOrderSummary,
    BoyCount,
    OrderRead,
    StatusUpdate,
)
from app.services import order_service

router = APIRouter(
    prefix="/admin/orders",
    tags=["admin orders"],
    dependencies=[Depends(require_admin)],  # ADMIN only (#89)
    responses={
        401: {"model": ErrorResponse, "description": "Not logged in"},
        403: {"model": ErrorResponse, "description": "Not an administrator"},
    },
)

DbSession = Annotated[Session, Depends(get_db)]


def _error(description: str) -> dict:
    return {"model": ErrorResponse, "description": description}


@router.get(
    "",
    response_model=AdminOrderPage,
    summary="Orders board (filter and paginate)",
    responses={422: _error("Invalid status, date, boy, page or page_size")},
)
def list_orders(
    db: DbSession,
    status: Annotated[OrderStatus | None, Query(description="Only orders with this status")] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    day: Annotated[
        date | None,
        Query(alias="date", description="India delivery day, YYYY-MM-DD (#104)"),
    ] = None,
    boy: Annotated[
        str | None, Query(description="A delivery boy's id, or 'unassigned' (#104)")
    ] = None,
    q: Annotated[
        str | None,
        Query(max_length=100, description="Customer name, phone or order number"),
    ] = None,
) -> AdminOrderPage:
    """Newest first. `status_counts` follow `date`, `boy` and `q` but ignore `status`
    (so without those filters they count ALL orders); `boy_counts` and
    `unassigned_count` follow `date` and `q`."""
    filters = AdminOrderFilters(day=day, boy=_read_boy(boy), q=(q or "").strip() or None)
    board = order_service.list_admin_orders(
        db, status=status, page=page, page_size=page_size, filters=filters
    )
    return AdminOrderPage(
        items=[
            AdminOrderSummary.from_order(order, account_name, delivery_boy)
            for order, account_name, delivery_boy in board.rows
        ],
        page=page,
        page_size=page_size,
        total=board.total,
        status_counts=board.status_counts,
        boy_counts=[
            BoyCount(delivery_boy_id=b.delivery_boy_id, name=b.name, orders=count)
            for b, count in board.boy_counts
        ],
        unassigned_count=board.unassigned_count,
    )


def _read_boy(value: str | None) -> int | str | None:
    """None, "unassigned", or a positive id; anything else → 422 on `boy`."""
    if value is None or value == "unassigned":
        return value
    if value.isdigit() and int(value) > 0:
        return int(value)
    raise InvalidFieldError(
        "boy must be a delivery boy's id or 'unassigned'.",
        details=[ErrorDetail(field="boy", issue="invalid")],
    )


@router.patch(
    "/{order_id}/status",
    response_model=OrderRead,
    summary="Update order status",
    responses={
        404: _error("No order with this id"),
        409: _error("INVALID_STATUS_TRANSITION, e.g. DELIVERED → PLACED"),
        422: _error("Unknown status or invalid id"),
    },
)
def update_status(
    order_id: Annotated[int, Path(gt=0)], data: StatusUpdate, db: DbSession
) -> OrderRead:
    return OrderRead.from_order(order_service.update_status(db, order_id, data.status))
