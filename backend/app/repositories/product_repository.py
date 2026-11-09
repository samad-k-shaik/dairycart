"""Queries for the products table (M1-10, admin writes: issue #86)."""

from collections.abc import Sequence

from sqlalchemy import exists, func, select
from sqlalchemy.orm import Session

from app.models import OrderItem, Product


class ProductRepository:
    """Reads and writes products. Knows HOW to query, not WHAT the business rules are.

    Write methods only flush (send the SQL so ids are known); the service decides when
    to commit, so one business action is one transaction.
    """

    def __init__(self, db: Session) -> None:
        self.db = db

    def list(self, include_unavailable: bool = False) -> Sequence[Product]:
        """Products ordered by product_id; only available ones unless asked otherwise."""
        query = select(Product).order_by(Product.product_id)
        if not include_unavailable:
            query = query.where(Product.is_available.is_(True))
        return self.db.scalars(query).all()

    def get(self, product_id: int) -> Product | None:
        """One product by primary key, or None if it does not exist."""
        return self.db.get(Product, product_id)

    def find_by_name_and_size(
        self, name: str, size: str, *, exclude_id: int | None = None
    ) -> Product | None:
        """A product with this name and size, ignoring upper/lower case
        ("cow milk" matches "Cow Milk"). `exclude_id` skips the product being edited."""
        query = select(Product).where(
            func.lower(Product.name) == name.lower(),
            func.lower(Product.size) == size.lower(),
        )
        if exclude_id is not None:
            query = query.where(Product.product_id != exclude_id)
        return self.db.scalars(query.limit(1)).first()

    def is_ordered(self, product_id: int) -> bool:
        """True if any order item points to this product."""
        query = select(exists().where(OrderItem.product_id == product_id))
        return bool(self.db.scalar(query))

    def add(self, product: Product) -> Product:
        self.db.add(product)
        self.db.flush()  # INSERT now, so product.product_id is filled in
        return product

    def delete(self, product: Product) -> None:
        self.db.delete(product)
        self.db.flush()
