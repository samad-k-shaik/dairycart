"""The logged-in user's saved delivery addresses (#102). Login required.

    GET    /api/v1/addresses                  → my addresses (default first)
    POST   /api/v1/addresses                  → add one          (201)
    PATCH  /api/v1/addresses/{id}             → edit some fields
    POST   /api/v1/addresses/{id}/default     → make it the default
    DELETE /api/v1/addresses/{id}             → delete           (204)

Someone else's address id answers 404, like a missing one. Rules:
services/address_service.py.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Path, Response, status
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser
from app.database.session import get_db
from app.schemas.address import AddressCreate, AddressRead, AddressUpdate
from app.schemas.common import ErrorResponse
from app.services import address_service

router = APIRouter(
    prefix="/addresses",
    tags=["addresses"],
    responses={401: {"model": ErrorResponse, "description": "Not logged in"}},
)

DbSession = Annotated[Session, Depends(get_db)]
AddressId = Annotated[int, Path(gt=0, description="A positive address id")]
NOT_FOUND = {404: {"model": ErrorResponse, "description": "Not one of your addresses"}}


@router.get("", response_model=list[AddressRead], summary="My addresses")
def list_addresses(db: DbSession, user: CurrentUser) -> list[AddressRead]:
    return [AddressRead.model_validate(a) for a in address_service.list_addresses(db, user.user_id)]


@router.post(
    "",
    response_model=AddressRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add an address",
    responses={
        409: {"model": ErrorResponse, "description": "ADDRESS_LIMIT_REACHED"},
        422: {"model": ErrorResponse, "description": "Invalid fields"},
    },
)
def create_address(data: AddressCreate, db: DbSession, user: CurrentUser) -> AddressRead:
    """The first address becomes the default; `is_default: true` makes this one it."""
    return AddressRead.model_validate(address_service.create_address(db, user.user_id, data))


@router.patch(
    "/{address_id}",
    response_model=AddressRead,
    summary="Edit an address",
    responses={**NOT_FOUND, 422: {"model": ErrorResponse, "description": "Invalid"}},
)
def update_address(
    address_id: AddressId, data: AddressUpdate, db: DbSession, user: CurrentUser
) -> AddressRead:
    """Orders already placed keep the address they were placed with."""
    return AddressRead.model_validate(
        address_service.update_address(db, user.user_id, address_id, data)
    )


@router.post(
    "/{address_id}/default",
    response_model=AddressRead,
    summary="Make an address the default",
    responses=NOT_FOUND,
)
def set_default(address_id: AddressId, db: DbSession, user: CurrentUser) -> AddressRead:
    return AddressRead.model_validate(address_service.set_default(db, user.user_id, address_id))


@router.delete(
    "/{address_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an address",
    responses=NOT_FOUND,
)
def delete_address(address_id: AddressId, db: DbSession, user: CurrentUser) -> Response:
    """Past orders keep their own copy. Deleting the default makes the oldest
    remaining address the default."""
    address_service.delete_address(db, user.user_id, address_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
