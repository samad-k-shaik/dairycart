"""Delivery boys and their areas (#103). Admin only; delivery boys do not log in.

- A delivery boy has a unique 10-digit phone number.
- An area is a PIN code. Each PIN code belongs to at most one delivery boy (also a
  database rule: UNIQUE pincode); allocating a PIN code that someone else has → 409
  naming the current owner, so the admin moves it on purpose.
- Deleting a delivery boy frees his areas. An inactive delivery boy keeps his areas,
  but his orders count as "Not assigned" (see delivery_service).
- Orders are matched when they are read, not stored: moving an area moves its orders.
"""

from collections.abc import Sequence
from typing import NoReturn

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import (
    AreaAlreadyAllocatedError,
    DeliveryBoyAlreadyExistsError,
    NotFoundError,
    UserAlreadyExistsError,
)
from app.core.security import hash_password
from app.models import DeliveryArea, DeliveryBoy, User, UserRole
from app.repositories.delivery_boy_repository import DeliveryBoyRepository
from app.repositories.user_repository import UserRepository
from app.schemas.common import ErrorDetail
from app.schemas.delivery_boy import AreaCreate, DeliveryBoyCreate, DeliveryBoyUpdate


def list_delivery_boys(db: Session) -> Sequence[DeliveryBoy]:
    return DeliveryBoyRepository(db).list_all()


def get_delivery_boy(db: Session, delivery_boy_id: int) -> DeliveryBoy:
    boy = DeliveryBoyRepository(db).get(delivery_boy_id)
    if boy is None:
        raise NotFoundError(f"Delivery boy {delivery_boy_id} was not found.")
    return boy


def _phone_taken(phone: str) -> DeliveryBoyAlreadyExistsError:
    return DeliveryBoyAlreadyExistsError(
        f"A delivery boy with phone {phone} already exists.",
        details=[ErrorDetail(field="phone", issue="already used")],
    )


def _area_taken(pincode: str, owner: str) -> AreaAlreadyAllocatedError:
    return AreaAlreadyAllocatedError(
        f"{pincode} is already allocated to {owner}. Remove it there first.",
        details=[ErrorDetail(field="pincode", issue="already allocated")],
    )


def _raise_for_integrity_error(db: Session, error: IntegrityError, value: str) -> NoReturn:
    """Two admins saving the same phone / PIN code at once: the database's UNIQUE
    constraint stops the second one; answer 409 instead of 500."""
    db.rollback()
    text = str(error.orig)
    if "uq_delivery_boys_phone" in text:
        raise _phone_taken(value) from error
    if "uq_delivery_areas_pincode" in text:
        raise _area_taken(value, "another delivery boy") from error
    raise error


def create_delivery_boy(db: Session, data: DeliveryBoyCreate) -> DeliveryBoy:
    repository = DeliveryBoyRepository(db)
    if repository.find_by_phone(data.phone):
        raise _phone_taken(data.phone)
    try:
        boy = DeliveryBoy(**data.model_dump())
        repository.add(boy)
        db.commit()
    except IntegrityError as error:
        _raise_for_integrity_error(db, error, data.phone)
    return get_delivery_boy(db, boy.delivery_boy_id)


def update_delivery_boy(db: Session, delivery_boy_id: int, data: DeliveryBoyUpdate) -> DeliveryBoy:
    repository = DeliveryBoyRepository(db)
    boy = get_delivery_boy(db, delivery_boy_id)
    changes = data.changes()
    phone = changes.get("phone", boy.phone)
    if repository.find_by_phone(phone, exclude_id=delivery_boy_id):
        raise _phone_taken(phone)
    # #109: his login follows the record (he logs in with the number the admin sees).
    if boy.user is not None and phone != boy.user.phone and UserRepository(db).phone_taken(phone):
        raise _account_exists(phone)
    try:
        for field, value in changes.items():
            setattr(boy, field, value)
        if boy.user is not None:
            boy.user.phone = boy.phone
            boy.user.full_name = boy.name
        db.commit()
    except IntegrityError as error:
        _raise_for_integrity_error(db, error, phone)
    return get_delivery_boy(db, delivery_boy_id)


def delete_delivery_boy(db: Session, delivery_boy_id: int) -> None:
    """His areas go with him (ON DELETE CASCADE); orders are not linked to him.
    #109: his login account is deleted too, so it cannot be used any more."""
    boy = get_delivery_boy(db, delivery_boy_id)
    try:
        account = boy.user
        DeliveryBoyRepository(db).delete(boy)
        if account is not None:
            db.delete(account)
        db.commit()
    except Exception:
        db.rollback()
        raise


def _account_exists(phone: str) -> UserAlreadyExistsError:
    return UserAlreadyExistsError(
        "Another account already uses this mobile number. A delivery boy logs in with his "
        "own number, so use a different one.",
        details=[ErrorDetail(field="phone", issue="already registered")],
    )


def set_login(db: Session, delivery_boy_id: int, password: str) -> DeliveryBoy:
    """#109: give the delivery boy a login, or a new password if he has one.

    The account uses his mobile number and name, with the role DELIVERY_BOY. A number
    that already belongs to a customer's account is refused (409): we never take over
    someone else's account."""
    boy = get_delivery_boy(db, delivery_boy_id)
    try:
        if boy.user is not None:
            boy.user.password_hash = hash_password(password)
        else:
            if UserRepository(db).phone_taken(boy.phone):
                raise _account_exists(boy.phone)
            boy.user = User(
                full_name=boy.name,
                phone=boy.phone,
                password_hash=hash_password(password),
                role=UserRole.DELIVERY_BOY,
            )
        db.commit()
    except IntegrityError as error:  # the same number registered at the same moment
        db.rollback()
        raise _account_exists(boy.phone) from error
    except Exception:
        db.rollback()
        raise
    return get_delivery_boy(db, delivery_boy_id)


def add_area(db: Session, delivery_boy_id: int, data: AreaCreate) -> DeliveryBoy:
    repository = DeliveryBoyRepository(db)
    boy = get_delivery_boy(db, delivery_boy_id)
    existing = repository.find_area(data.pincode)
    if existing is not None:
        if existing.delivery_boy_id == delivery_boy_id:
            raise AreaAlreadyAllocatedError(
                f"{data.pincode} is already one of {boy.name}'s areas.",
                details=[ErrorDetail(field="pincode", issue="already allocated")],
            )
        raise _area_taken(data.pincode, existing.delivery_boy.name)
    try:
        repository.add(
            DeliveryArea(
                delivery_boy_id=boy.delivery_boy_id,
                pincode=data.pincode,
                area_name=data.area_name or None,
            )
        )
        db.commit()
    except IntegrityError as error:
        _raise_for_integrity_error(db, error, data.pincode)
    return get_delivery_boy(db, delivery_boy_id)


def remove_area(db: Session, delivery_boy_id: int, pincode: str) -> DeliveryBoy:
    repository = DeliveryBoyRepository(db)
    get_delivery_boy(db, delivery_boy_id)
    area = repository.find_area(pincode)
    if area is None or area.delivery_boy_id != delivery_boy_id:
        raise NotFoundError(f"{pincode} is not one of this delivery boy's areas.")
    try:
        repository.delete(area)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return get_delivery_boy(db, delivery_boy_id)
