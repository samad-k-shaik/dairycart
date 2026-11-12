"""Product business logic (M1-10; admin add / edit / delete: issue #86)."""

from collections.abc import Sequence
from typing import NoReturn

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError, ProductAlreadyExistsError, ProductInUseError
from app.models import Product
from app.repositories.product_repository import ProductRepository
from app.schemas.common import ErrorDetail
from app.schemas.product import ProductCreate, ProductUpdate

IN_USE_MESSAGE = (
    "This product has already been ordered, so it cannot be deleted. "
    "Mark it unavailable instead."
)


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


def _already_exists(name: str, size: str) -> ProductAlreadyExistsError:
    return ProductAlreadyExistsError(
        f"A product named '{name}' with size '{size}' already exists.",
        details=[ErrorDetail(field="name", issue="name and size must be unique")],
    )


def _raise_for_integrity_error(
    db: Session, error: IntegrityError, name: str, size: str
) -> NoReturn:
    """If two admins save the same name + size at the same moment, our check above passes
    for both; the database's UNIQUE constraint then catches the second one. Answer 409
    instead of 500. Any other database error is re-raised (→ 500, logged)."""
    db.rollback()
    if "uq_products_name_size" in str(error.orig):
        raise _already_exists(name, size) from error
    raise error


def create_product(db: Session, data: ProductCreate) -> Product:
    """Admin adds a product. The same name + size (any letter case) → 409."""
    repository = ProductRepository(db)
    if repository.find_by_name_and_size(data.name, data.size):
        raise _already_exists(data.name, data.size)

    try:
        product = repository.add(
            Product(
                name=data.name,
                size=data.size,
                price=data.price,
                is_available=data.is_available,
                stock_quantity=data.stock_quantity,
            )
        )
        db.commit()
    except IntegrityError as error:
        _raise_for_integrity_error(db, error, data.name, data.size)
    return product


def update_product(db: Session, product_id: int, data: ProductUpdate) -> Product:
    """Admin edits some or all fields of a product.

    Old orders are not affected: each order item stores its own unit_price (BR-1).
    """
    repository = ProductRepository(db)
    product = get_product(db, product_id)
    changes = data.changes()

    name = changes.get("name", product.name)
    size = changes.get("size", product.size)
    if repository.find_by_name_and_size(name, size, exclude_id=product_id):
        raise _already_exists(name, size)

    try:
        for field, value in changes.items():
            setattr(product, field, value)
        db.commit()
    except IntegrityError as error:
        _raise_for_integrity_error(db, error, name, size)
    return product


def delete_product(db: Session, product_id: int) -> None:
    """Admin deletes a product, but only if it was never ordered.

    An ordered product must stay, so old orders can still show what was bought; the
    database would refuse anyway (ON DELETE RESTRICT). The admin marks it unavailable
    instead, which hides it from customers.
    """
    repository = ProductRepository(db)
    product = get_product(db, product_id)
    if repository.is_ordered(product_id):
        raise ProductInUseError(IN_USE_MESSAGE)

    try:
        repository.delete(product)
        db.commit()
    except IntegrityError as error:  # ordered in the same moment by a customer
        db.rollback()
        raise ProductInUseError(IN_USE_MESSAGE) from error
