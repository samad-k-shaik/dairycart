"""Tests for the test setup itself (M1-11): isolation, safety and the client fixture."""

from decimal import Decimal

from sqlalchemy import Engine, select, text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Product
from tests import factories

# Both tests insert the SAME product. (name, size) is UNIQUE, so whichever runs second
# would fail if the first one's data survived. Passing in any order proves rollback works.
SAME_NAME = {"name": "Isolation Milk", "size": "1 Litre"}


def test_isolation_first(db_session: Session) -> None:
    factories.make_product(db_session, **SAME_NAME)
    db_session.commit()  # even a commit (as services do) is rolled back afterwards

    assert db_session.scalar(select(Product).filter_by(**SAME_NAME)) is not None


def test_isolation_second(db_session: Session) -> None:
    factories.make_product(db_session, **SAME_NAME)
    db_session.commit()

    assert db_session.scalar(select(Product).filter_by(**SAME_NAME)) is not None


def test_each_test_starts_with_an_empty_database(db_session: Session) -> None:
    assert db_session.scalars(select(Product)).all() == []


def test_tests_never_use_the_development_database(db_engine: Engine) -> None:
    settings_db = get_settings().database_url.get_secret_value().rsplit("/", 1)[-1]
    with db_engine.connect() as connection:
        connected_db = connection.execute(
            text("SELECT current_database()")
        ).scalar_one()

    assert settings_db == connected_db == "milk_delivery_test"
    assert connected_db.endswith("_test")


def test_factories_create_valid_linked_rows(db_session: Session) -> None:
    cow = factories.make_product(db_session, price="60.00")
    buffalo = factories.make_product(db_session, price="35.00")

    order = factories.make_order(db_session, items=[(cow, 2), (buffalo, 1)])

    assert order.order_id is not None
    assert [i.subtotal for i in order.items] == [Decimal("120.00"), Decimal("35.00")]
    assert order.total_amount == Decimal("155.00")
    assert (
        factories.make_customer(db_session).phone
        != factories.make_customer(db_session).phone
    )
