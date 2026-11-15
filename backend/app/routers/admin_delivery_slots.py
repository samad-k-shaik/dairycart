"""Admin delivery slot management (#100). ADMIN only (401 without a token, 403 for a USER).

    GET    /api/v1/admin/delivery-slots        → all slots with capacity and bookings
    POST   /api/v1/admin/delivery-slots        → add a slot              (201)
    PATCH  /api/v1/admin/delivery-slots/{id}   → edit some fields        (200)
    DELETE /api/v1/admin/delivery-slots/{id}   → delete if never booked  (204)

The rules are in services/delivery_slot_service.py.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Path, Response, status
from sqlalchemy.orm import Session

from app.core.auth import require_admin
from app.database.session import get_db
from app.models import DeliverySlot
from app.schemas.common import ErrorResponse
from app.schemas.delivery_slot import (
    AdminDeliverySlotRead,
    DeliverySlotCreate,
    DeliverySlotUpdate,
)
from app.services import delivery_slot_service

router = APIRouter(
    prefix="/admin/delivery-slots",
    tags=["admin delivery slots"],
    dependencies=[Depends(require_admin)],
    responses={
        401: {"model": ErrorResponse, "description": "Not logged in"},
        403: {"model": ErrorResponse, "description": "Not an administrator"},
    },
)

DbSession = Annotated[Session, Depends(get_db)]
SlotId = Annotated[int, Path(gt=0, description="A positive delivery slot id")]


def _error(description: str) -> dict:
    return {"model": ErrorResponse, "description": description}


def _read(db: Session, slot: DeliverySlot) -> AdminDeliverySlotRead:
    booked = delivery_slot_service.booked_count(db, slot.delivery_slot_id)
    return AdminDeliverySlotRead.from_slot(slot, booked)


@router.get("", response_model=list[AdminDeliverySlotRead], summary="All delivery slots")
def list_slots(db: DbSession) -> list[AdminDeliverySlotRead]:
    """Switched-off slots too, by start time. `booked` = ACTIVE subscriptions."""
    return [
        AdminDeliverySlotRead.from_slot(slot, booked)
        for slot, booked in delivery_slot_service.list_all(db)
    ]


@router.post(
    "",
    response_model=AdminDeliverySlotRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add a delivery slot",
    responses={
        409: _error("DELIVERY_SLOT_ALREADY_EXISTS: same start and end time"),
        422: _error("Invalid fields, e.g. end time not after start time"),
    },
)
def create_slot(data: DeliverySlotCreate, db: DbSession) -> AdminDeliverySlotRead:
    """Times as "HH:MM", e.g. `"08:00"`. `is_active` defaults to `true`."""
    return _read(db, delivery_slot_service.create_slot(db, data))


@router.patch(
    "/{slot_id}",
    response_model=AdminDeliverySlotRead,
    summary="Edit a delivery slot",
    responses={
        404: _error("No slot with this id"),
        409: _error("DELIVERY_SLOT_ALREADY_EXISTS or LAST_ACTIVE_DELIVERY_SLOT"),
        422: _error("Invalid fields"),
    },
)
def update_slot(slot_id: SlotId, data: DeliverySlotUpdate, db: DbSession) -> AdminDeliverySlotRead:
    """Send only the fields that change. Orders already created keep their time."""
    return _read(db, delivery_slot_service.update_slot(db, slot_id, data))


@router.delete(
    "/{slot_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a slot that was never booked",
    responses={
        404: _error("No slot with this id"),
        409: _error("DELIVERY_SLOT_IN_USE or LAST_ACTIVE_DELIVERY_SLOT"),
    },
)
def delete_slot(slot_id: SlotId, db: DbSession) -> Response:
    delivery_slot_service.delete_slot(db, slot_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
