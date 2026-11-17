"""Saved delivery addresses (#102).

- A user keeps up to MAX_ADDRESSES_PER_USER addresses; exactly one is the default once
  they have any. The first address becomes the default; deleting the default makes the
  oldest remaining address the default.
- Users only ever see and change their OWN addresses (someone else's id → 404).
- Orders and subscriptions get a TEXT COPY of an address (`delivery_copy_for`): the
  chosen one, or the default when none is chosen. A user without any address cannot
  order (422 on `address_id`).
"""

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Self

from sqlalchemy.orm import Session

from app.core.errors import AddressLimitReachedError, InvalidFieldError, NotFoundError
from app.models import MAX_ADDRESSES_PER_USER, Address
from app.repositories.address_repository import AddressRepository
from app.schemas.address import AddressCreate, AddressUpdate
from app.schemas.common import ErrorDetail


def list_addresses(db: Session, user_id: int) -> Sequence[Address]:
    return AddressRepository(db).list_by_user(user_id)


def _not_found(address_id: int) -> NotFoundError:
    return NotFoundError(f"Address {address_id} was not found.")


def _make_default(addresses: Sequence[Address], chosen: Address, db: Session) -> None:
    """Unset the old default FIRST (flush), then set the new one: the database allows
    only one default per user at any moment (uq_addresses_one_default_per_user)."""
    for address in addresses:
        if address.is_default and address is not chosen:
            address.is_default = False
    db.flush()
    chosen.is_default = True


def create_address(db: Session, user_id: int, data: AddressCreate) -> Address:
    repository = AddressRepository(db)
    try:
        existing = repository.lock_user_addresses(user_id)
        if len(existing) >= MAX_ADDRESSES_PER_USER:
            raise AddressLimitReachedError(
                f"You can save up to {MAX_ADDRESSES_PER_USER} addresses. Delete one to add another."
            )
        address = repository.add(Address(user_id=user_id, **data.values()))
        if data.is_default or not existing:
            _make_default(existing, address, db)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return address


def update_address(db: Session, user_id: int, address_id: int, data: AddressUpdate) -> Address:
    """Orders already placed keep their own copy of the old text."""
    address = AddressRepository(db).get_for_user(address_id, user_id)
    if address is None:
        raise _not_found(address_id)
    try:
        for field, value in data.changes().items():
            setattr(address, field, value)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return address


def set_default(db: Session, user_id: int, address_id: int) -> Address:
    repository = AddressRepository(db)
    try:
        addresses = repository.lock_user_addresses(user_id)
        chosen = next((a for a in addresses if a.address_id == address_id), None)
        if chosen is None:
            raise _not_found(address_id)
        _make_default(addresses, chosen, db)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return chosen


def delete_address(db: Session, user_id: int, address_id: int) -> None:
    """Allowed for any address: orders and subscriptions keep their own text copy."""
    repository = AddressRepository(db)
    try:
        addresses = repository.lock_user_addresses(user_id)
        address = next((a for a in addresses if a.address_id == address_id), None)
        if address is None:
            raise _not_found(address_id)
        was_default = address.is_default
        repository.delete(address)
        remaining = [a for a in addresses if a is not address]
        if was_default and remaining:
            remaining[0].is_default = True  # the oldest remaining one
        db.commit()
    except Exception:
        db.rollback()
        raise


@dataclass(frozen=True)
class DeliveryAddressCopy:
    """What an order or subscription keeps of an address: the one-line text, the
    PIN code on its own (#103: to match the delivery boy who covers that area) and the
    map pin (#108: None when the customer did not drop one)."""

    text: str
    pincode: str
    latitude: float | None = None
    longitude: float | None = None

    @classmethod
    def of(cls, address: Address) -> Self:
        return cls(address.full_text, address.pincode, address.latitude, address.longitude)


def delivery_copy_for(db: Session, user_id: int, address_id: int | None) -> DeliveryAddressCopy:
    """The address to copy onto an order or subscription.

    `address_id` given → that address, which must be the user's own. Not given → the
    user's default. No address at all → 422, so nobody orders without an address.
    Does not commit (it is one step of placing an order)."""
    repository = AddressRepository(db)
    if address_id is not None:
        address = repository.get_for_user(address_id, user_id)
        if address is None:
            raise InvalidFieldError(
                "This address is not available. Please choose another one.",
                details=[ErrorDetail(field="address_id", issue="not available")],
            )
        return DeliveryAddressCopy.of(address)
    default = repository.get_default(user_id)
    if default is None:
        raise InvalidFieldError(
            "Please add a delivery address first.",
            details=[ErrorDetail(field="address_id", issue="required")],
        )
    return DeliveryAddressCopy.of(default)
