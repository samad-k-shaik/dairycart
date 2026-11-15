"""Delivery slot rules (#100).

- Customers see the ACTIVE slots, each with the places left.
- Booking (subscribe or "Change time") locks the slot row and checks its capacity, so
  two people can never take the last place at the same moment.
- Capacity counts ACTIVE subscriptions only: a cancelled or completed plan frees its
  place. Lowering the capacity never removes a booking; the slot just shows Full.
- Admin: add / edit / switch off / delete. A booked slot cannot be deleted (switch it off
  instead), and the LAST active slot can neither be switched off nor deleted, so
  customers always have a time to choose.
"""

from datetime import time
from typing import NoReturn

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import (
    DeliverySlotAlreadyExistsError,
    DeliverySlotFullError,
    DeliverySlotInUseError,
    InvalidFieldError,
    LastActiveDeliverySlotError,
    NotFoundError,
)
from app.models import DeliverySlot
from app.repositories.delivery_slot_repository import DeliverySlotRepository
from app.schemas.common import ErrorDetail
from app.schemas.delivery_slot import DeliverySlotCreate, DeliverySlotUpdate

IN_USE_MESSAGE = (
    "This delivery time has been booked, so it cannot be deleted. "
    "Switch it off instead."
)
LAST_ACTIVE_MESSAGE = (
    "Customers need at least one delivery time. Add or switch on another slot first."
)


# ---- Customers ----


def list_available(db: Session) -> list[tuple[DeliverySlot, int]]:
    """Active slots by time, each with its number of active bookings."""
    return DeliverySlotRepository(db).list_with_booked(only_active=True)


def book(db: Session, slot_id: int) -> DeliverySlot:
    """Checks that `slot_id` can take one more subscription and LOCKS it until the
    caller commits. Does not commit: it is one step of subscribe / change time."""
    repository = DeliverySlotRepository(db)
    slot = repository.get_for_update(slot_id)
    if slot is None or not slot.is_active:
        raise InvalidFieldError(
            "This delivery time is not available. Please choose another one.",
            details=[ErrorDetail(field="delivery_slot_id", issue="not available")],
        )
    if repository.booked_count(slot_id) >= slot.capacity:
        raise DeliverySlotFullError(
            f"The {slot.label} delivery time is full. Please choose another one."
        )
    return slot


# ---- Admin ----


def list_all(db: Session) -> list[tuple[DeliverySlot, int]]:
    return DeliverySlotRepository(db).list_with_booked()


def get_slot(db: Session, slot_id: int) -> DeliverySlot:
    slot = DeliverySlotRepository(db).get(slot_id)
    if slot is None:
        raise NotFoundError(f"Delivery slot {slot_id} was not found.")
    return slot


def booked_count(db: Session, slot_id: int) -> int:
    return DeliverySlotRepository(db).booked_count(slot_id)


def _already_exists(start: time, end: time) -> DeliverySlotAlreadyExistsError:
    return DeliverySlotAlreadyExistsError(
        f"A delivery slot from {start:%H:%M} to {end:%H:%M} already exists.",
        details=[ErrorDetail(field="start_time", issue="slot times must be unique")],
    )


def _raise_for_integrity_error(
    db: Session, error: IntegrityError, start: time, end: time
) -> NoReturn:
    """Two admins saving the same times at once: the UNIQUE constraint stops the
    second one; answer 409 instead of 500."""
    db.rollback()
    if "uq_delivery_slots_times" in str(error.orig):
        raise _already_exists(start, end) from error
    raise error


def _lock_for_change(
    repository: DeliverySlotRepository, slot_id: int, *, may_switch_off: bool
) -> DeliverySlot:
    """Locks the slot, or raises NotFoundError.

    When the change may switch a slot off (or delete it), ALL active slots are locked
    first, always in id order, and then the "last active slot" rule is checked. Two
    admins switching off the last two slots at once then wait for each other instead of
    both succeeding, and because everyone locks in the same order they cannot deadlock.
    """
    active = repository.lock_active() if may_switch_off else []
    slot = repository.get_for_update(slot_id)
    if slot is None:
        raise NotFoundError(f"Delivery slot {slot_id} was not found.")
    if may_switch_off and slot.is_active and len(active) <= 1:
        raise LastActiveDeliverySlotError(LAST_ACTIVE_MESSAGE)
    return slot


def create_slot(db: Session, data: DeliverySlotCreate) -> DeliverySlot:
    repository = DeliverySlotRepository(db)
    if repository.find_by_times(data.start_time, data.end_time):
        raise _already_exists(data.start_time, data.end_time)
    try:
        slot = repository.add(DeliverySlot(**data.model_dump()))
        db.commit()
    except IntegrityError as error:
        _raise_for_integrity_error(db, error, data.start_time, data.end_time)
    return slot


def update_slot(db: Session, slot_id: int, data: DeliverySlotUpdate) -> DeliverySlot:
    """Edit some fields. Orders already created keep the time they were made with
    (orders.delivery_slot is a copy); future orders use the new time."""
    repository = DeliverySlotRepository(db)
    try:
        changes = data.changes()
        slot = _lock_for_change(
            repository, slot_id, may_switch_off=changes.get("is_active") is False
        )
        start = changes.get("start_time", slot.start_time)
        end = changes.get("end_time", slot.end_time)
        if end <= start:
            raise InvalidFieldError(
                "The end time must be after the start time.",
                details=[ErrorDetail(field="end_time", issue="must be after start")],
            )
        if repository.find_by_times(start, end, exclude_id=slot_id):
            raise _already_exists(start, end)

        for field, value in changes.items():
            setattr(slot, field, value)
        db.commit()
    except IntegrityError as error:
        _raise_for_integrity_error(db, error, start, end)
    except Exception:
        db.rollback()
        raise
    return slot


def delete_slot(db: Session, slot_id: int) -> None:
    """Only a slot nobody ever booked, and never the last active one."""
    repository = DeliverySlotRepository(db)
    try:
        slot = _lock_for_change(repository, slot_id, may_switch_off=True)
        if repository.is_used(slot_id):
            raise DeliverySlotInUseError(IN_USE_MESSAGE)
        repository.delete(slot)
        db.commit()
    except IntegrityError as error:  # booked in the same moment by a customer
        db.rollback()
        raise DeliverySlotInUseError(IN_USE_MESSAGE) from error
    except Exception:
        db.rollback()
        raise
