"""Delivery boy app (#109): what a logged-in DELIVERY_BOY can see and do.

    GET   /api/v1/delivery/me                      → his record and areas (PIN codes)
    GET   /api/v1/delivery/me/orders?date=          → the day's orders in his areas
    PATCH /api/v1/delivery/me/orders/{id}/status    → OUT_FOR_DELIVERY or DELIVERED

Every endpoint needs a DELIVERY_BOY login whose delivery boy is active (core/auth.py →
require_delivery_boy): 401 without a login, 403 for customers, admins and switched-off
delivery boys. Rules: services/delivery_service.py.
"""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.orm import Session

from app.core.auth import CurrentDeliveryBoy
from app.database.session import get_db
from app.schemas.common import ErrorResponse
from app.schemas.delivery import DeliveryMeRead, DeliveryOrderRead, DeliveryStatusUpdate
from app.services import delivery_service
from app.services.subscription_service import today_ist

router = APIRouter(
    prefix="/delivery",
    tags=["delivery boy app"],
    responses={
        401: {"model": ErrorResponse, "description": "Not logged in"},
        403: {"model": ErrorResponse, "description": "Not an active delivery boy"},
    },
)

DbSession = Annotated[Session, Depends(get_db)]


@router.get("/me", response_model=DeliveryMeRead, summary="My record and areas")
def me(boy: CurrentDeliveryBoy) -> DeliveryMeRead:
    return DeliveryMeRead.from_boy(boy)


@router.get(
    "/me/orders",
    response_model=list[DeliveryOrderRead],
    summary="The day's orders in my areas",
)
def my_orders(
    boy: CurrentDeliveryBoy,
    db: DbSession,
    day: Annotated[
        date | None,
        Query(alias="date", description="India delivery day, YYYY-MM-DD (default: today)"),
    ] = None,
) -> list[DeliveryOrderRead]:
    orders = delivery_service.my_orders(db, boy, day or today_ist())
    return [DeliveryOrderRead.from_order(order) for order in orders]


@router.patch(
    "/me/orders/{order_id}/status",
    response_model=DeliveryOrderRead,
    summary="Mark my order out for delivery or delivered",
    responses={
        404: {"model": ErrorResponse, "description": "No such order in my areas"},
        409: {"model": ErrorResponse, "description": "INVALID_STATUS_TRANSITION"},
        422: {"model": ErrorResponse, "description": "Status not allowed for delivery boys"},
    },
)
def update_status(
    order_id: Annotated[int, Path(gt=0)],
    data: DeliveryStatusUpdate,
    boy: CurrentDeliveryBoy,
    db: DbSession,
) -> DeliveryOrderRead:
    order = delivery_service.update_my_order_status(db, boy, order_id, data.status)
    return DeliveryOrderRead.from_order(order)
