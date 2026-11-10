"""Customer order endpoints (M3-04, M3-05):

    POST /api/v1/orders              → place an order (201 + Location header)
    GET  /api/v1/orders/{order_id}   → one order
    GET  /api/v1/orders?phone=...    → a customer's order history, newest first (ADR-005)

The router only handles HTTP; the rules are in services/order_service.py.
"""

from dataclasses import asdict
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, Response, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.common import ErrorResponse
from app.schemas.order import OrderCreate, OrderRead, OrderSummary
from app.services import order_service

router = APIRouter(prefix="/orders", tags=["orders"])

DbSession = Annotated[Session, Depends(get_db)]


def _error(description: str) -> dict:
    return {"model": ErrorResponse, "description": description}


@router.post(
    "",
    response_model=OrderRead,
    status_code=status.HTTP_201_CREATED,
    summary="Place an order",
    responses={
        400: _error("DUPLICATE_PRODUCT: the same product twice"),
        404: _error("NOT_FOUND: a product does not exist"),
        409: _error("PRODUCT_UNAVAILABLE: a product is not available"),
        422: _error("Invalid body, or prices/totals were sent"),
    },
)
def create_order(data: OrderCreate, response: Response, db: DbSession) -> OrderRead:
    """Send only product ids and quantities. The backend calculates every price and
    the total from the database. If any item fails, nothing is saved."""
    order = order_service.create_order(db, data)
    response.headers["Location"] = f"/api/v1/orders/{order.order_id}"
    return OrderRead.from_order(order)


@router.get(
    "/{order_id}",
    response_model=OrderRead,
    summary="Order details",
    responses={404: _error("No order with this id"), 422: _error("Invalid id")},
)
def get_order(
    order_id: Annotated[int, Path(gt=0, description="A positive order id")],
    db: DbSession,
) -> OrderRead:
    return OrderRead.from_order(order_service.get_order(db, order_id))


@router.get(
    "",
    response_model=list[OrderSummary],
    summary="Customer order history",
    responses={422: _error("Missing or invalid phone")},
)
def list_orders_by_phone(
    phone: Annotated[
        str,
        Query(
            pattern=r"^[6-9]\d{9}$",
            description="10-digit Indian mobile number used at checkout",
        ),
    ],
    db: DbSession,
) -> list[OrderSummary]:
    """Newest first. An unknown phone returns `[]`.

    POC risk (ADR-003): there is no login, so anyone who knows a phone number can see
    that customer's orders.
    """
    rows = order_service.list_orders_by_phone(db, phone)
    return [OrderSummary.model_validate(asdict(row)) for row in rows]
