"""Delivery slots for customers (#100).

    GET /api/v1/delivery-slots   → active slots by time, with the places left

Public, like the product list: the checkout page shows them before subscribing.
"""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.delivery_slot import DeliverySlotRead
from app.services import delivery_slot_service

router = APIRouter(prefix="/delivery-slots", tags=["delivery slots"])

DbSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[DeliverySlotRead], summary="Delivery times to choose from")
def list_delivery_slots(db: DbSession) -> list[DeliverySlotRead]:
    """A full slot is still listed (`is_full: true`) so the page can show "Full"."""
    return [
        DeliverySlotRead.from_slot(slot, booked)
        for slot, booked in delivery_slot_service.list_available(db)
    ]
