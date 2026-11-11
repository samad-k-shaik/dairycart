"""Order business logic (M3-03 create, M3-05 read, M3-06 status rules, M3-07 admin list).

The key rule: the backend calculates every price and total from the DATABASE (BR-2).
The request only says which products and how many.
"""

from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.errors import (
    DuplicateProductError,
    InsufficientStockError,
    InvalidStatusTransitionError,
    NotFoundError,
    ProductUnavailableError,
)
from app.models import Order, OrderItem, OrderStatus, User, UserRole
from app.repositories.customer_repository import CustomerRepository
from app.repositories.order_repository import OrderRepository, OrderRow
from app.repositories.product_repository import ProductRepository
from app.schemas.common import ErrorDetail
from app.schemas.order import OrderCreate

# Which status can follow which (functional requirements → Order status lifecycle).
# DELIVERED and CANCELLED are final: nothing can follow them.
ALLOWED_TRANSITIONS: dict[OrderStatus, frozenset[OrderStatus]] = {
    OrderStatus.PLACED: frozenset({OrderStatus.CONFIRMED, OrderStatus.CANCELLED}),
    OrderStatus.CONFIRMED: frozenset(
        {OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED}
    ),
    OrderStatus.OUT_FOR_DELIVERY: frozenset({OrderStatus.DELIVERED}),
    OrderStatus.DELIVERED: frozenset(),
    OrderStatus.CANCELLED: frozenset(),
}


def _item_field(index: int) -> str:
    return f"items[{index}].product_id"


def create_order(db: Session, data: OrderCreate, user: User) -> Order:
    """Place an order for the logged-in `user` (#90). Either everything is saved, or
    nothing is (one transaction).

    1. The same product twice → 400 DUPLICATE_PRODUCT (BR-4)
    2. Unknown product → 404, unavailable product → 409; the whole order fails (BR-3)
    3. More than the stock → 409 INSUFFICIENT_STOCK (#92)
    4. Find the customer by phone, or create them (BR-5)
    5. unit_price = the product's price NOW (snapshot, BR-1); subtotal and total (BR-2)
    6. Reduce each product's stock by the ordered quantity (#92)
    """
    # Read the id now, before building the order: reading it later (after an earlier
    # commit expired `user`) would make SQLAlchemy save half-built order lines too early.
    user_id = user.user_id
    product_ids = [item.product_id for item in data.items]
    seen: set[int] = set()
    for index, product_id in enumerate(product_ids):
        if product_id in seen:
            raise DuplicateProductError(
                "The same product appears more than once.",
                details=[ErrorDetail(field=_item_field(index), issue="duplicate")],
            )
        seen.add(product_id)

    try:
        # All products in ONE query, LOCKED until commit (#92): another order for the
        # same products waits here, so the stock check below cannot be outdated.
        products = ProductRepository(db).get_many_for_update(product_ids)
        for index, requested in enumerate(data.items):
            product = products.get(requested.product_id)
            if product is None:
                raise NotFoundError(
                    f"Product {requested.product_id} was not found.",
                    details=[ErrorDetail(field=_item_field(index), issue="not found")],
                )
            if not product.is_available:
                raise ProductUnavailableError(
                    f"Product '{product.name} {product.size}' is currently unavailable.",
                    details=[
                        ErrorDetail(field=_item_field(index), issue="unavailable")
                    ],
                )
            if requested.quantity > product.stock_quantity:
                # No number in the message: stock levels are for admins only.
                raise InsufficientStockError(
                    f"Only a limited quantity of '{product.name} {product.size}' is "
                    "left. Please reduce the quantity.",
                    details=[
                        ErrorDetail(
                            field=f"items[{index}].quantity", issue="more than in stock"
                        )
                    ],
                )

        customers = CustomerRepository(db)
        customer = customers.get_by_phone(data.customer.phone) or customers.create(
            data.customer.name, data.customer.phone
        )

        items = []
        for requested in data.items:
            product = products[requested.product_id]
            unit_price: Decimal = product.price  # snapshot (BR-1)
            product.stock_quantity -= requested.quantity  # #92 (row is locked)
            items.append(
                OrderItem(
                    product=product,
                    quantity=requested.quantity,
                    unit_price=unit_price,
                    subtotal=unit_price * requested.quantity,
                )
            )
        order = Order(
            customer=customer,  # delivery contact (name + phone from the form)
            user_id=user_id,  # the account that placed it (#90)
            items=items,
            status=OrderStatus.PLACED,
            total_amount=sum((item.subtotal for item in items), Decimal("0.00")),
        )
        OrderRepository(db).add(order)
        db.commit()
    except Exception:
        db.rollback()  # nothing from this order stays in the database
        raise

    # Reload with eager loading: after commit the objects are expired, and reading
    # order.items[i].product one by one would be N+1 queries. This also gets
    # order_date, which the database fills in (server default now()).
    return get_order(db, order.order_id)


def get_order(db: Session, order_id: int) -> Order:
    order = OrderRepository(db).get_with_items(order_id)
    if order is None:
        raise NotFoundError(f"Order {order_id} was not found.")
    return order


def get_order_for(db: Session, order_id: int, user: User) -> Order:
    """One order, but only for its owner or an ADMIN (#90).

    Anyone else gets the SAME 404 as for an order that does not exist, so nobody can
    find out which order ids exist by trying them.
    """
    order = OrderRepository(db).get_with_items(order_id)
    is_allowed = order is not None and (
        user.role == UserRole.ADMIN or order.user_id == user.user_id
    )
    if not is_allowed:
        raise NotFoundError(f"Order {order_id} was not found.")
    return order


def list_my_orders(db: Session, user: User) -> list[OrderRow]:
    """The logged-in user's orders, newest first ("My orders", #90)."""
    return OrderRepository(db).list_by_user(user.user_id)


def list_admin_orders(
    db: Session, *, status: OrderStatus | None, page: int, page_size: int
) -> tuple[list[OrderRow], int, dict[OrderStatus, int]]:
    """One page of orders, the total matching the filter, and counts for ALL orders."""
    repository = OrderRepository(db)
    rows, total = repository.list_admin(status, page, page_size)
    return rows, total, repository.count_by_status()


def update_status(db: Session, order_id: int, new_status: OrderStatus) -> Order:
    """Move an order to a new status, only along ALLOWED_TRANSITIONS (FR-A4).

    The order row is locked while we check and save, so two admins cannot both change
    it at the same time. This is the one place future notifications (SMS, WhatsApp)
    would hook in.

    Cancelling puts the ordered quantities back into stock (#92).
    """
    try:
        order = OrderRepository(db).get_for_update(order_id)
        if order is None:
            raise NotFoundError(f"Order {order_id} was not found.")
        if new_status not in ALLOWED_TRANSITIONS[order.status]:
            raise InvalidStatusTransitionError(
                f"Cannot change status from {order.status.value} to {new_status.value}.",
                details=[ErrorDetail(field="status", issue="transition not allowed")],
            )
        if new_status == OrderStatus.CANCELLED:
            quantities = {item.product_id: item.quantity for item in order.items}
            products = ProductRepository(db).get_many_for_update(quantities)
            for product_id, quantity in quantities.items():
                products[product_id].stock_quantity += quantity
        order.status = new_status
        db.commit()  # also releases the row locks
    except Exception:
        db.rollback()
        raise
    return get_order(db, order_id)  # fresh, eagerly loaded (see create_order)
