"""Admin order endpoints (M3-07):

    GET   /api/v1/admin/orders                     → one page of orders + status counts
    PATCH /api/v1/admin/orders/{order_id}/status   → move an order to its next status

TODO(auth): admin routes are not protected in the POC (ADR-003, NFR-10). They all live
under /admin so one dependency can protect them when login is added.
"""

from dataclasses import asdict
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models import OrderStatus
from app.schemas.common import ErrorResponse
from app.schemas.order import AdminOrderPage, AdminOrderSummary, OrderRead, StatusUpdate
from app.services import order_service

router = APIRouter(prefix="/admin/orders", tags=["admin orders"])

DbSession = Annotated[Session, Depends(get_db)]


def _error(description: str) -> dict:
    return {"model": ErrorResponse, "description": description}


@router.get(
    "",
    response_model=AdminOrderPage,
    summary="All orders (filter and paginate)",
    responses={422: _error("Invalid status, page or page_size")},
)
def list_orders(
    db: DbSession,
    status: Annotated[
        OrderStatus | None, Query(description="Only orders with this status")
    ] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> AdminOrderPage:
    """Newest first. `status_counts` counts ALL orders (ignores `status`)."""
    rows, total, counts = order_service.list_admin_orders(
        db, status=status, page=page, page_size=page_size
    )
    return AdminOrderPage(
        items=[AdminOrderSummary(**asdict(row)) for row in rows],
        page=page,
        page_size=page_size,
        total=total,
        status_counts=counts,
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
