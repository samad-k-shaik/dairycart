"""GET /api/v1/products and GET /api/v1/products/{product_id} (M1-10).

Routers only handle HTTP: read and validate parameters, call the service, return the
response model. No SQL and no business rules here.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.common import ErrorResponse
from app.schemas.product import ProductRead
from app.services import product_service

router = APIRouter(tags=["products"])

DbSession = Annotated[Session, Depends(get_db)]
VALIDATION_ERROR = {422: {"model": ErrorResponse, "description": "Invalid parameters"}}


@router.get(
    "/products",
    response_model=list[ProductRead],
    summary="List products",
    responses=VALIDATION_ERROR,
)
def list_products(
    db: DbSession,
    include_unavailable: Annotated[
        bool,
        Query(
            description="Admin view: also return products that are not available (ADR-006)"
        ),
    ] = False,
) -> list[ProductRead]:
    """Products ordered by `product_id`. Returns `[]` (not 404) when there are none."""
    products = product_service.list_products(
        db, include_unavailable=include_unavailable
    )
    return [ProductRead.model_validate(product) for product in products]


@router.get(
    "/products/{product_id}",
    response_model=ProductRead,
    summary="Product details",
    responses={404: {"model": ErrorResponse, "description": "No product with this id"}}
    | VALIDATION_ERROR,
)
def get_product(
    product_id: Annotated[int, Path(gt=0, description="A positive product id")],
    db: DbSession,
) -> ProductRead:
    return ProductRead.model_validate(product_service.get_product(db, product_id))
