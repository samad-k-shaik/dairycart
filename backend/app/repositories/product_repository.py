"""Queries for the products table (M1-10)."""

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Product


class ProductRepository:
    """Reads products. Knows HOW to query, not WHAT the business rules are."""

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
