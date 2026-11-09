"""Tests for the seed script (M1-07)."""

import re
from decimal import Decimal
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Customer, Product
from app.scripts.seed import CATALOGUE, DEMO_CUSTOMER, seed

SEED_SQL = Path(__file__).resolve().parents[2] / "database" / "seed.sql"


def count(db: Session, model: type) -> int:
    return db.scalar(select(func.count()).select_from(model)) or 0


def test_running_the_seed_twice_gives_4_products_and_1_customer(
    db_session: Session,
) -> None:
    first = seed(db_session)
    second = seed(db_session)

    assert (first.products_added, first.customers_added) == (4, 1)
    assert (second.products_added, second.customers_added) == (0, 0)  # idempotent
    assert count(db_session, Product) == 4
    assert count(db_session, Customer) == 1


def test_prices_and_sizes_match_the_catalogue(db_session: Session) -> None:
    seed(db_session)

    rows = db_session.execute(
        select(
            Product.name, Product.size, Product.price, Product.is_available
        ).order_by(Product.product_id)
    ).all()

    assert [tuple(r) for r in rows] == [
        ("Cow Milk", "500 ml", Decimal("30.00"), True),
        ("Cow Milk", "1 Litre", Decimal("60.00"), True),
        ("Buffalo Milk", "500 ml", Decimal("35.00"), True),
        ("Buffalo Milk", "1 Litre", Decimal("70.00"), True),
    ]
    customer = db_session.scalars(select(Customer)).one()
    assert (customer.name, customer.phone) == ("Demo Customer", "9000000001")


def test_seed_does_not_overwrite_a_changed_price(db_session: Session) -> None:
    seed(db_session)
    cow = db_session.scalars(select(Product).where(Product.size == "1 Litre")).first()
    assert cow is not None
    cow.price = Decimal("65.00")  # e.g. the shop changed the price later
    db_session.flush()

    seed(db_session)

    db_session.refresh(cow)
    assert cow.price == Decimal("65.00")


def test_catalogue_matches_database_seed_sql() -> None:
    """The Python catalogue and database/seed.sql must never drift apart."""
    sql = SEED_SQL.read_text(encoding="utf-8")
    sql_products = [
        (name, size, Decimal(price))
        for name, size, price in re.findall(
            r"\('([^']+)',\s*'([^']+)',\s*([\d.]+),", sql
        )
    ]
    sql_customer = re.search(r"\('([^']+)',\s*'(\d{10})'\)", sql)

    assert sql_products == CATALOGUE
    assert sql_customer is not None
    assert sql_customer.groups() == (DEMO_CUSTOMER["name"], DEMO_CUSTOMER["phone"])
