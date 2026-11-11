"""Tests for the ORM models (M1-05): relationships, and the schema vs the ERD.

The schema tests run against the TEST database migrated with Alembic (`migrated_db`
in conftest.py, M1-06), so they check exactly the schema production gets.
"""

from collections.abc import Callable
from decimal import Decimal

import pytest
from sqlalchemy import Engine, delete, inspect, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.base import Base
from app.models import Customer, Order, OrderItem, OrderStatus, Product
from tests import factories

# ---- relationships (no database needed) ----


def test_order_with_two_items_links_them_correctly() -> None:
    customer = Customer(name="Ravi Kumar", phone="9876543210")
    cow = Product(name="Cow Milk", size="1 Litre", price=Decimal("60.00"))
    buffalo = Product(name="Buffalo Milk", size="500 ml", price=Decimal("35.00"))
    first = OrderItem(
        product=cow, quantity=2, unit_price=Decimal("60.00"), subtotal=Decimal("120.00")
    )
    second = OrderItem(
        product=buffalo,
        quantity=1,
        unit_price=Decimal("35.00"),
        subtotal=Decimal("35.00"),
    )

    order = Order(
        customer=customer, total_amount=Decimal("155.00"), items=[first, second]
    )

    assert order.items == [first, second]
    assert first.order is order and second.order is order  # item → order
    assert customer.orders == [order]  # customer → orders (back_populates)
    assert cow.order_items == [first]  # product → its order lines
    assert sum(item.subtotal for item in order.items) == order.total_amount


def test_order_status_is_a_string_enum_with_the_five_states() -> None:
    assert [s.value for s in OrderStatus] == [
        "PLACED",
        "CONFIRMED",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED",
    ]
    assert OrderStatus.PLACED == "PLACED"


def test_all_tables_are_registered_for_alembic() -> None:
    assert set(Base.metadata.tables) == {
        "customers",
        "products",
        "orders",
        "order_items",
        "users",  # #89
    }


def test_reprs_never_contain_the_phone_number() -> None:
    assert "9876543210" not in repr(
        Customer(customer_id=1, name="Ravi", phone="9876543210")
    )


# ---- generated schema vs the ERD (needs PostgreSQL) ----


@pytest.fixture
def schema(migrated_db: Engine) -> Engine:
    """The test database with the schema created by the Alembic migrations."""
    return migrated_db


ERD_COLUMNS = {
    "customers": {
        "customer_id": ("INTEGER", False),
        "name": ("VARCHAR(100)", False),
        "phone": ("VARCHAR(15)", False),
        "created_at": ("TIMESTAMP WITH TIME ZONE", False),
    },
    "products": {
        "product_id": ("INTEGER", False),
        "name": ("VARCHAR(100)", False),
        "size": ("VARCHAR(20)", False),
        "price": ("NUMERIC(10, 2)", False),
        "is_available": ("BOOLEAN", False),
        "created_at": ("TIMESTAMP WITH TIME ZONE", False),
    },
    "orders": {
        "order_id": ("INTEGER", False),
        "customer_id": ("INTEGER", False),
        "order_date": ("TIMESTAMP WITH TIME ZONE", False),
        "total_amount": ("NUMERIC(10, 2)", False),
        "status": ("VARCHAR(20)", False),
        "user_id": ("INTEGER", True),  # nullable: orders from before #90
    },
    "order_items": {
        "order_item_id": ("INTEGER", False),
        "order_id": ("INTEGER", False),
        "product_id": ("INTEGER", False),
        "quantity": ("INTEGER", False),
        "unit_price": ("NUMERIC(10, 2)", False),
        "subtotal": ("NUMERIC(10, 2)", False),
    },
}


@pytest.mark.parametrize("table", sorted(ERD_COLUMNS))
def test_columns_types_and_not_null_match_the_erd(schema: Engine, table: str) -> None:
    def sql_type(column_type: object) -> str:
        # The inspector's TIMESTAMP prints as "TIMESTAMP" even for TIMESTAMPTZ; the time
        # zone is a separate flag, so spell it out like PostgreSQL does.
        if getattr(column_type, "timezone", False):
            return "TIMESTAMP WITH TIME ZONE"
        return str(column_type)

    columns = {
        c["name"]: (sql_type(c["type"]), c["nullable"])
        for c in inspect(schema).get_columns(table)
    }

    assert columns == ERD_COLUMNS[table]


def test_primary_keys_are_serial(schema: Engine) -> None:
    inspector = inspect(schema)
    for table, pk in [
        ("customers", "customer_id"),
        ("products", "product_id"),
        ("orders", "order_id"),
        ("order_items", "order_item_id"),
    ]:
        assert inspector.get_pk_constraint(table)["constrained_columns"] == [pk]
        default = next(c for c in inspector.get_columns(table) if c["name"] == pk)[
            "default"
        ]
        assert default.startswith("nextval(")  # SERIAL = integer + sequence


def test_server_defaults(schema: Engine) -> None:
    def default(table: str, column: str) -> str:
        return next(
            c for c in inspect(schema).get_columns(table) if c["name"] == column
        )["default"]

    assert default("customers", "created_at") == "now()"
    assert default("products", "created_at") == "now()"
    assert default("products", "is_available") == "true"
    assert default("orders", "order_date") == "now()"
    assert default("orders", "status").startswith("'PLACED'")


def test_check_and_unique_constraints_have_readable_names(schema: Engine) -> None:
    inspector = inspect(schema)
    checks = {
        c["name"] for t in ERD_COLUMNS for c in inspector.get_check_constraints(t)
    }
    uniques = {
        c["name"] for t in ERD_COLUMNS for c in inspector.get_unique_constraints(t)
    }

    assert checks == {
        "ck_products_price_positive",
        "ck_orders_total_amount_non_negative",
        "ck_orders_status_allowed",
        "ck_order_items_quantity_range",
        "ck_order_items_unit_price_positive",
        "ck_order_items_subtotal_non_negative",
    }
    assert uniques == {
        "uq_customers_phone",
        "uq_products_name_size",
        "uq_order_items_order_product",
    }


def test_foreign_keys_and_on_delete_rules(schema: Engine) -> None:
    inspector = inspect(schema)
    fks = {
        (t, fk["constrained_columns"][0]): (
            fk["referred_table"],
            fk["options"].get("ondelete"),
        )
        for t in ("orders", "order_items")
        for fk in inspector.get_foreign_keys(t)
    }

    assert fks == {
        ("orders", "customer_id"): ("customers", "RESTRICT"),
        ("orders", "user_id"): ("users", "RESTRICT"),  # #90
        ("order_items", "order_id"): ("orders", "CASCADE"),
        ("order_items", "product_id"): ("products", "RESTRICT"),
    }


def test_indexes_from_the_erd(schema: Engine) -> None:
    inspector = inspect(schema)
    indexes = {
        (t, ix["name"], tuple(ix["column_names"]))
        for t in ("orders", "order_items")
        for ix in inspector.get_indexes(t)
    }

    assert ("orders", "idx_orders_customer_id", ("customer_id",)) in indexes
    assert ("orders", "idx_orders_status", ("status",)) in indexes
    assert ("order_items", "idx_order_items_order", ("order_id",)) in indexes


# ---- the database enforces the rules ----


@pytest.fixture
def session(db_session: Session) -> Session:
    """A session whose changes are rolled back after each test (see conftest.py)."""
    return db_session


def make_order(db: Session, quantity: int = 2) -> Order:
    """2 × Cow Milk 1 Litre for Ravi: fixed name/phone so the duplicate tests can clash."""
    return factories.make_order(
        db,
        customer=factories.make_customer(db, name="Ravi Kumar", phone="9876543210"),
        items=[
            (
                factories.make_product(
                    db, name="Cow Milk", size="1 Litre", price="60.00"
                ),
                quantity,
            )
        ],
    )


def rejected(db: Session, change: Callable[[], object]) -> bool:
    """True if the database refuses the change (IntegrityError), inside a savepoint."""
    try:
        with db.begin_nested():
            change()
            db.flush()
    except IntegrityError:
        return True
    return False


def test_saved_order_gets_defaults_and_exact_decimals(session: Session) -> None:
    order = make_order(session)
    session.expire_all()

    saved = session.scalars(select(Order)).one()
    assert saved.status is OrderStatus.PLACED
    assert saved.order_date.tzinfo is not None  # TIMESTAMPTZ
    assert saved.total_amount == Decimal("120.00") and isinstance(
        saved.total_amount, Decimal
    )
    assert saved.items[0].product.is_available is True
    assert saved.customer.orders == [saved]
    assert order.order_id == saved.order_id


@pytest.mark.parametrize("quantity", [0, 21])
def test_quantity_must_be_between_1_and_20(session: Session, quantity: int) -> None:
    order = make_order(session)
    item = order.items[0]

    assert rejected(session, lambda: setattr(item, "quantity", quantity))


def test_price_must_be_positive(session: Session) -> None:
    assert rejected(
        session,
        lambda: session.add(
            Product(name="Free Milk", size="1 Litre", price=Decimal("0.00"))
        ),
    )


def test_unknown_status_is_rejected_by_the_database(session: Session) -> None:
    order = make_order(session)

    assert rejected(
        session,
        lambda: session.execute(
            text("UPDATE orders SET status = 'SHIPPED' WHERE order_id = :id"),
            {"id": order.order_id},
        ),
    )


def test_duplicate_product_name_and_size_is_rejected(session: Session) -> None:
    make_order(session)

    assert rejected(
        session,
        lambda: session.add(
            Product(name="Cow Milk", size="1 Litre", price=Decimal("61.00"))
        ),
    )


def test_duplicate_phone_is_rejected(session: Session) -> None:
    make_order(session)

    assert rejected(
        session, lambda: session.add(Customer(name="Someone", phone="9876543210"))
    )


def test_product_used_in_an_order_cannot_be_deleted(session: Session) -> None:
    order = make_order(session)
    product_id = order.items[0].product_id

    assert rejected(
        session,
        lambda: session.execute(
            delete(Product).where(Product.product_id == product_id)
        ),
    )


def test_deleting_an_order_deletes_its_items(session: Session) -> None:
    order = make_order(session)
    order_id = order.order_id

    session.execute(delete(Order).where(Order.order_id == order_id))
    session.expire_all()

    assert (
        session.scalars(select(OrderItem).where(OrderItem.order_id == order_id)).all()
        == []
    )
