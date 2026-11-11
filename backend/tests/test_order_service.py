"""Service and repository tests for orders (M3-02, M3-03, M3-06)."""

from decimal import Decimal

import pytest
from sqlalchemy import event, func, select
from sqlalchemy.orm import Session

from app.core.errors import (
    DuplicateProductError,
    InvalidStatusTransitionError,
    NotFoundError,
    ProductUnavailableError,
)
from app.models import Customer, Order, OrderStatus
from app.repositories.customer_repository import CustomerRepository
from app.repositories.order_repository import OrderRepository
from app.repositories.product_repository import ProductRepository
from app.schemas.order import OrderCreate
from app.services import order_service
from tests import factories


def order_request(
    items: list[tuple[int, int]], phone: str = "9876543210"
) -> OrderCreate:
    return OrderCreate.model_validate(
        {
            "customer": {"name": "Ravi Kumar", "phone": phone},
            "items": [{"product_id": p, "quantity": q} for p, q in items],
        }
    )


def count(db: Session, model) -> int:
    return db.scalar(select(func.count()).select_from(model))


# ---- create_order (M3-03) ----


def test_total_is_calculated_from_database_prices(db_session: Session) -> None:
    cow = factories.make_product(db_session, price="60.00")
    buffalo = factories.make_product(db_session, price="35.00")

    order = order_service.create_order(
        db_session,
        order_request([(cow.product_id, 2), (buffalo.product_id, 1)]),
        factories.make_user(db_session),
    )

    assert order.total_amount == Decimal("155.00")
    assert [i.subtotal for i in order.items] == [Decimal("120.00"), Decimal("35.00")]
    assert order.status == OrderStatus.PLACED


@pytest.mark.parametrize(
    ("error", "setup"),
    [
        (DuplicateProductError, "duplicate"),
        (NotFoundError, "missing"),
        (ProductUnavailableError, "unavailable"),
    ],
)
def test_errors_leave_the_database_unchanged(
    db_session: Session, error: type[Exception], setup: str
) -> None:
    good = factories.make_product(db_session)
    other = factories.make_product(db_session, is_available=setup != "unavailable")
    items = {
        "duplicate": [(good.product_id, 1), (good.product_id, 2)],
        "missing": [(good.product_id, 1), (424242, 1)],
        "unavailable": [(good.product_id, 1), (other.product_id, 1)],
    }[setup]

    with pytest.raises(error):
        order_service.create_order(
            db_session, user=factories.make_user(db_session), data=order_request(items)
        )

    assert (count(db_session, Order), count(db_session, Customer)) == (0, 0)


def test_forced_failure_while_saving_rolls_everything_back(
    db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    product = factories.make_product(db_session)

    def broken_add(self, order):
        self.db.add(order)
        self.db.flush()  # customer, order and items are INSERTed ...
        raise RuntimeError("disk full")  # ... then something fails before commit

    monkeypatch.setattr(OrderRepository, "add", broken_add)

    with pytest.raises(RuntimeError):
        order_service.create_order(
            db_session,
            user=factories.make_user(db_session),
            data=order_request([(product.product_id, 1)]),
        )

    assert (count(db_session, Order), count(db_session, Customer)) == (0, 0)


def test_new_phone_creates_a_customer_existing_phone_reuses_it(
    db_session: Session,
) -> None:
    product = factories.make_product(db_session)
    existing = factories.make_customer(db_session, name="Old Name", phone="9000000001")

    buyer = factories.make_user(db_session)
    reused = order_service.create_order(
        db_session, order_request([(product.product_id, 1)], phone="9000000001"), buyer
    )
    created = order_service.create_order(
        db_session, order_request([(product.product_id, 1)], phone="9000000002"), buyer
    )

    assert reused.customer.customer_id == existing.customer_id
    assert created.customer.customer_id != existing.customer_id
    assert count(db_session, Customer) == 2


# ---- update_status (M3-06) ----


def test_update_status_follows_the_rules(db_session: Session) -> None:
    product = factories.make_product(db_session)
    order = factories.make_order(db_session, items=[(product, 1)])

    updated = order_service.update_status(
        db_session, order.order_id, OrderStatus.CONFIRMED
    )
    assert updated.status == OrderStatus.CONFIRMED

    with pytest.raises(InvalidStatusTransitionError) as caught:
        order_service.update_status(db_session, order.order_id, OrderStatus.PLACED)
    assert caught.value.message == "Cannot change status from CONFIRMED to PLACED."


def test_update_status_unknown_order(db_session: Session) -> None:
    with pytest.raises(NotFoundError):
        order_service.update_status(db_session, 424242, OrderStatus.CONFIRMED)


# ---- repositories (M3-02) ----


def test_customer_repository(db_session: Session) -> None:
    repository = CustomerRepository(db_session)

    created = repository.create("Asha", "9888888888")

    assert repository.get_by_phone("9888888888") is created
    assert repository.get_by_phone("9777777777") is None


def test_product_repository_get_many(db_session: Session) -> None:
    a = factories.make_product(db_session)
    b = factories.make_product(db_session)

    found = ProductRepository(db_session).get_many([a.product_id, b.product_id, 424242])

    assert found == {a.product_id: a, b.product_id: b}


def test_order_with_items_loads_in_a_fixed_number_of_queries(
    db_session: Session,
) -> None:
    products = [factories.make_product(db_session) for _ in range(5)]
    order_id = factories.make_order(
        db_session, items=[(p, 1) for p in products]
    ).order_id
    db_session.expire_all()  # forget everything loaded, like a fresh request

    statements: list[str] = []
    engine = db_session.get_bind()
    listener = lambda *args: statements.append(args[2])
    event.listen(engine, "before_cursor_execute", listener)
    try:
        loaded = OrderRepository(db_session).get_with_items(order_id)
        names = [item.product.name for item in loaded.items]  # must not query again
        _ = loaded.customer.name
    finally:
        event.remove(engine, "before_cursor_execute", listener)

    assert len(names) == 5
    assert len(statements) == 2  # order + customer, then items + products (not 1 + 5)


def test_order_repository_lists(db_session: Session) -> None:
    product = factories.make_product(db_session)
    customer = factories.make_customer(db_session, phone="9111111111")
    first = factories.make_order(db_session, customer=customer, items=[(product, 1)])
    second = factories.make_order(
        db_session,
        customer=customer,
        items=[(product, 2)],
        status=OrderStatus.CANCELLED,
    )
    repository = OrderRepository(db_session)

    owner = factories.make_user(db_session)
    first.user_id = second.user_id = owner.user_id
    db_session.flush()
    history = repository.list_by_user(owner.user_id)
    rows, total = repository.list_admin(OrderStatus.CANCELLED, page=1, page_size=10)

    assert [r.order_id for r in history] == [second.order_id, first.order_id]
    assert ([r.order_id for r in rows], total) == ([second.order_id], 1)
    assert repository.count_by_status()[OrderStatus.PLACED] == 1
    assert repository.get_for_update(first.order_id) is first
