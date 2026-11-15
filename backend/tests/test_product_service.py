"""Unit tests for the product service (M1-10; admin writes: issue #86)."""

from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError, ProductAlreadyExistsError, ProductInUseError
from app.repositories.product_repository import ProductRepository
from app.schemas.product import ProductCreate, ProductUpdate
from app.services import product_service
from tests import factories


def test_get_product_raises_not_found_for_a_missing_product(
    db_session: Session,
) -> None:
    with pytest.raises(NotFoundError) as caught:
        product_service.get_product(db_session, 424242)

    assert caught.value.message == "Product 424242 was not found."
    assert caught.value.status_code == 404


def test_get_product_returns_the_product(db_session: Session) -> None:
    product = factories.make_product(db_session)

    assert product_service.get_product(db_session, product.product_id) is product


def test_list_products_filters_and_orders(db_session: Session) -> None:
    first = factories.make_product(db_session)
    hidden = factories.make_product(db_session, is_available=False)
    last = factories.make_product(db_session)

    assert list(product_service.list_products(db_session)) == [first, last]
    assert list(
        product_service.list_products(db_session, include_unavailable=True)
    ) == [
        first,
        hidden,
        last,
    ]


# ---- admin add / edit / delete (issue #86) ----


def test_create_product_commits_and_returns_the_product(db_session: Session) -> None:
    data = ProductCreate(name="Toned Milk", size="500 ml", price="28.50")

    product = product_service.create_product(db_session, data)

    assert product.product_id is not None
    assert product.price == Decimal("28.50")


def test_create_product_rejects_a_duplicate(db_session: Session) -> None:
    factories.make_product(db_session, name="Toned Milk", size="500 ml")

    with pytest.raises(ProductAlreadyExistsError):
        product_service.create_product(
            db_session, ProductCreate(name="TONED milk", size="500 ML", price="1.00")
        )


def test_update_product_changes_only_sent_fields(db_session: Session) -> None:
    product = factories.make_product(db_session, size="1 Litre", price="60.00")

    product_service.update_product(
        db_session, product.product_id, ProductUpdate(price="65.00")
    )

    assert (product.size, product.price) == ("1 Litre", Decimal("65.00"))


def test_delete_product_refuses_an_ordered_product(db_session: Session) -> None:
    product = factories.make_product(db_session)
    factories.make_order(db_session, items=[(product, 1)])

    with pytest.raises(ProductInUseError) as caught:
        product_service.delete_product(db_session, product.product_id)

    assert caught.value.status_code == 409


def test_delete_product_missing_is_not_found(db_session: Session) -> None:
    with pytest.raises(NotFoundError):
        product_service.delete_product(db_session, 424242)


# The database is the last safety net when two requests race past the service checks.


def test_duplicate_that_slips_past_the_check_still_gives_409(
    db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    factories.make_product(db_session, name="Toned Milk", size="500 ml")
    # Pretend another request inserted it just after our check ran.
    monkeypatch.setattr(
        ProductRepository, "find_by_name_and_size", lambda *args, **kwargs: None
    )

    with pytest.raises(ProductAlreadyExistsError):
        product_service.create_product(
            db_session, ProductCreate(name="Toned Milk", size="500 ml", price="1.00")
        )


def test_ordered_product_that_slips_past_the_check_still_gives_409(
    db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    product = factories.make_product(db_session)
    factories.make_order(db_session, items=[(product, 1)])
    monkeypatch.setattr(ProductRepository, "is_ordered", lambda *args: False)

    with pytest.raises(ProductInUseError):
        product_service.delete_product(db_session, product.product_id)
