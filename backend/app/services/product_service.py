"""Product business logic (M1-10)."""

from collections.abc import Sequence

from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.models import Product
from app.repositories.product_repository import ProductRepository


def list_products(
    db: Session, *, include_unavailable: bool = False
) -> Sequence[Product]:
    """Customers see available products only; the admin products page passes
    include_unavailable=True (ADR-006)."""
    return ProductRepository(db).list(include_unavailable=include_unavailable)


def get_product(db: Session, product_id: int) -> Product:
    """One product, or NotFoundError (→ 404 NOT_FOUND) if it does not exist.

    Unavailable products are still returned: the details page shows them as unavailable,
    and refusing to ORDER them is the order service's job (409, M3).
    """
    product = ProductRepository(db).get(product_id)
    if product is None:
        raise NotFoundError(f"Product {product_id} was not found.")
    return product
