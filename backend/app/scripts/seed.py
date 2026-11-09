"""Load the initial product catalogue and the demo customer (M1-07).

Run from backend/ after `alembic upgrade head`:

    python -m app.scripts.seed

Idempotent: safe to run any number of times. Rows that already exist are left
untouched (PostgreSQL `INSERT ... ON CONFLICT DO NOTHING`), so running it twice still
gives exactly 4 products and 1 demo customer, and it never overwrites a price that was
changed later. Data matches database/seed.sql and docs/01-project-overview.md.

Seed data is not part of the migrations: migrations define the STRUCTURE every
environment needs; this is starting CONTENT for development, tests and the demo.
"""

from dataclasses import dataclass
from decimal import Decimal

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.models import Customer, Product

# (name, size, price in INR). Same as database/seed.sql (checked by tests/test_seed.py).
CATALOGUE: list[tuple[str, str, Decimal]] = [
    ("Cow Milk", "500 ml", Decimal("30.00")),
    ("Cow Milk", "1 Litre", Decimal("60.00")),
    ("Buffalo Milk", "500 ml", Decimal("35.00")),
    ("Buffalo Milk", "1 Litre", Decimal("70.00")),
]

# Demo customer for the POC (no authentication in scope).
DEMO_CUSTOMER = {"name": "Demo Customer", "phone": "9000000001"}


@dataclass(frozen=True)
class SeedResult:
    products_added: int
    customers_added: int


def seed(db: Session) -> SeedResult:
    """Inserts the catalogue and demo customer if missing, then commits."""
    products = (
        insert(Product)
        .values(
            [
                {"name": name, "size": size, "price": price, "is_available": True}
                for name, size, price in CATALOGUE
            ]
        )
        # Skip a product whose (name, size) already exists.
        .on_conflict_do_nothing(constraint="uq_products_name_size")
        .returning(Product.product_id)  # only the rows actually inserted come back
    )
    customers = (
        insert(Customer)
        .values(DEMO_CUSTOMER)
        .on_conflict_do_nothing(constraint="uq_customers_phone")
        .returning(Customer.customer_id)
    )

    products_added = len(db.execute(products).all())
    customers_added = len(db.execute(customers).all())
    db.commit()
    return SeedResult(products_added, customers_added)


def main() -> None:
    with SessionLocal() as db:
        result = seed(db)
        total_products = db.query(Product).count()
        total_customers = db.query(Customer).count()

    print(
        f"Seed complete: {result.products_added} product(s) and "
        f"{result.customers_added} customer(s) added. "
        f"Database now has {total_products} product(s) and {total_customers} customer(s)."
    )


if __name__ == "__main__":
    main()
