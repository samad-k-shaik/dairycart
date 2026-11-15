"""Admin delivery boys and their areas (#103). ADMIN only (401 / 403 otherwise).
Delivery boys are records kept by the admin. Since #109 the admin can give one a login
(his mobile number + a password) for the /delivery pages.

    GET    /api/v1/admin/delivery-boys                       → all, with areas + today's orders
    POST   /api/v1/admin/delivery-boys                       → add            (201)
    PATCH  /api/v1/admin/delivery-boys/{id}                  → edit
    DELETE /api/v1/admin/delivery-boys/{id}                  → delete (frees his areas, 204)
    POST   /api/v1/admin/delivery-boys/{id}/areas            → allocate a PIN code
    DELETE /api/v1/admin/delivery-boys/{id}/areas/{pincode}  → remove a PIN code
    PUT    /api/v1/admin/delivery-boys/{id}/login            → his login / new password (#109)

Rules: services/delivery_boy_service.py.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Path, Response, status
from sqlalchemy.orm import Session

from app.core.auth import require_admin
from app.database.session import get_db
from app.models import DeliveryBoy
from app.schemas.common import ErrorResponse
from app.schemas.delivery_boy import (
    AreaCreate,
    DeliveryBoyCreate,
    DeliveryBoyRead,
    DeliveryBoyUpdate,
    DeliveryLoginSet,
)
from app.services import delivery_boy_service, delivery_service
from app.services.subscription_service import today_ist

router = APIRouter(
    prefix="/admin/delivery-boys",
    tags=["admin delivery boys"],
    dependencies=[Depends(require_admin)],
    responses={
        401: {"model": ErrorResponse, "description": "Not logged in"},
        403: {"model": ErrorResponse, "description": "Not an administrator"},
    },
)

DbSession = Annotated[Session, Depends(get_db)]
BoyId = Annotated[int, Path(gt=0, description="A positive delivery boy id")]
Pincode = Annotated[str, Path(pattern=r"^[1-9][0-9]{5}$", description="6-digit PIN")]


def _error(description: str) -> dict:
    return {"model": ErrorResponse, "description": description}


def _read(db: Session, boy: DeliveryBoy, counts: dict[int, int] | None = None) -> DeliveryBoyRead:
    if counts is None:
        counts = delivery_service.todays_orders_per_boy(db, today_ist())
    read = DeliveryBoyRead.model_validate(boy)
    read.today_orders = counts.get(boy.delivery_boy_id, 0)
    read.has_login = boy.user_id is not None  # #109
    return read


@router.get("", response_model=list[DeliveryBoyRead], summary="All delivery boys")
def list_delivery_boys(db: DbSession) -> list[DeliveryBoyRead]:
    """Active first, then by name. `today_orders`: today's orders in his areas."""
    counts = delivery_service.todays_orders_per_boy(db, today_ist())
    return [_read(db, boy, counts) for boy in delivery_boy_service.list_delivery_boys(db)]


@router.post(
    "",
    response_model=DeliveryBoyRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add a delivery boy",
    responses={
        409: _error("DELIVERY_BOY_ALREADY_EXISTS (same phone)"),
        422: _error("Invalid"),
    },
)
def create_delivery_boy(data: DeliveryBoyCreate, db: DbSession) -> DeliveryBoyRead:
    return _read(db, delivery_boy_service.create_delivery_boy(db, data))


@router.patch(
    "/{delivery_boy_id}",
    response_model=DeliveryBoyRead,
    summary="Edit a delivery boy",
    responses={
        404: _error("No such delivery boy"),
        409: _error("DELIVERY_BOY_ALREADY_EXISTS"),
    },
)
def update_delivery_boy(
    delivery_boy_id: BoyId, data: DeliveryBoyUpdate, db: DbSession
) -> DeliveryBoyRead:
    """Switching him off keeps his areas; his orders then show as not assigned."""
    return _read(db, delivery_boy_service.update_delivery_boy(db, delivery_boy_id, data))


@router.delete(
    "/{delivery_boy_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a delivery boy",
    responses={404: _error("No such delivery boy")},
)
def delete_delivery_boy(delivery_boy_id: BoyId, db: DbSession) -> Response:
    delivery_boy_service.delete_delivery_boy(db, delivery_boy_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{delivery_boy_id}/areas",
    response_model=DeliveryBoyRead,
    summary="Allocate an area (PIN code)",
    responses={
        404: _error("No such delivery boy"),
        409: _error("AREA_ALREADY_ALLOCATED: the PIN code belongs to someone"),
        422: _error("Invalid PIN code"),
    },
)
def add_area(delivery_boy_id: BoyId, data: AreaCreate, db: DbSession) -> DeliveryBoyRead:
    """One delivery boy per PIN code: remove it from the other one first."""
    return _read(db, delivery_boy_service.add_area(db, delivery_boy_id, data))


@router.delete(
    "/{delivery_boy_id}/areas/{pincode}",
    response_model=DeliveryBoyRead,
    summary="Remove an area",
    responses={404: _error("Not one of his areas")},
)
def remove_area(delivery_boy_id: BoyId, pincode: Pincode, db: DbSession) -> DeliveryBoyRead:
    return _read(db, delivery_boy_service.remove_area(db, delivery_boy_id, pincode))


@router.put(
    "/{delivery_boy_id}/login",
    response_model=DeliveryBoyRead,
    summary="Create his login, or set a new password (#109)",
    responses={
        404: _error("No such delivery boy"),
        409: _error("USER_ALREADY_EXISTS: another account already uses his mobile number"),
        422: _error("Password breaks the rules (8+ characters, a letter and a number)"),
    },
)
def set_login(delivery_boy_id: BoyId, data: DeliveryLoginSet, db: DbSession) -> DeliveryBoyRead:
    """He logs in with his mobile number and this password, on the /delivery pages.
    The password is never returned; tell it to him in person."""
    return _read(db, delivery_boy_service.set_login(db, delivery_boy_id, data.password))
