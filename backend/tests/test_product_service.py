"""Unit tests for the product service (M1-10)."""

import pytest
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
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
