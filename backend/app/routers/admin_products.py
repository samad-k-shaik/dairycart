"""Admin product management (issue #86):

    GET    /api/v1/admin/products                → all products WITH stock numbers (#92)
    POST   /api/v1/admin/products                → add a product        (201)
    PATCH  /api/v1/admin/products/{product_id}   → edit some fields     (200)
    DELETE /api/v1/admin/products/{product_id}   → delete if never ordered (204)

ADMIN only (#89): 401 without a token, 403 for a USER. Like every router, this one only
handles HTTP; the rules live in services/product_service.py.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Path, Response, status
from sqlalchemy.orm import Session

from app.core.auth import require_admin
from app.database.session import get_db
from app.schemas.common import ErrorResponse
from app.schemas.product import AdminProductRead, ProductCreate, ProductUpdate
from app.services import product_service

router = APIRouter(
    prefix="/admin/products",
    tags=["admin products"],
    dependencies=[Depends(require_admin)],  # ADMIN only (#89)
    responses={
        401: {"model": ErrorResponse, "description": "Not logged in"},
        403: {"model": ErrorResponse, "description": "Not an administrator"},
    },
)

DbSession = Annotated[Session, Depends(get_db)]
ProductId = Annotated[int, Path(gt=0, description="A positive product id")]


def _error(description: str) -> dict:
    return {"model": ErrorResponse, "description": description}


@router.get(
    "", response_model=list[AdminProductRead], summary="All products with stock"
)
def list_products(db: DbSession) -> list[AdminProductRead]:
    """Every product, including unavailable ones, with `stock_quantity` (#92)."""
    products = product_service.list_products(db, include_unavailable=True)
    return [AdminProductRead.model_validate(product) for product in products]


@router.post(
    "",
    response_model=AdminProductRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add a product",
    responses={
        409: _error("PRODUCT_ALREADY_EXISTS: same name and size"),
        422: _error("Invalid fields"),
    },
)
def create_product(data: ProductCreate, db: DbSession) -> AdminProductRead:
    """Price is a string with up to 2 decimals, e.g. `"45.00"`. `is_available` defaults
    to `true`."""
    return AdminProductRead.model_validate(product_service.create_product(db, data))


@router.patch(
    "/{product_id}",
    response_model=AdminProductRead,
    summary="Edit a product",
    responses={
        404: _error("No product with this id"),
        409: _error("PRODUCT_ALREADY_EXISTS: same name and size"),
        422: _error("Invalid fields"),
    },
)
def update_product(
    product_id: ProductId, data: ProductUpdate, db: DbSession
) -> AdminProductRead:
    """Send only the fields that change. Old orders keep the price they were placed at."""
    return AdminProductRead.model_validate(
        product_service.update_product(db, product_id, data)
    )


@router.delete(
    "/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a product that was never ordered",
    responses={
        404: _error("No product with this id"),
        409: _error("PRODUCT_IN_USE: already ordered; mark it unavailable instead"),
        422: _error("Invalid product id"),
    },
)
def delete_product(product_id: ProductId, db: DbSession) -> Response:
    product_service.delete_product(db, product_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
