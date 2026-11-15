"""Small helpers to create test data (M1-11).

Every helper adds the object to the session and flushes, so it gets its id, and every
value has a sensible default. Names and phones are unique per call, so tests never clash
on UNIQUE constraints. All data disappears when the test's transaction is rolled back.

    product = make_product(db, price="35.00", is_available=False)
    order = make_order(db, items=[(product, 2)])
"""

import itertools
from datetime import datetime, time, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password
from app.models import (
    Address,
    Customer,
    DeliverySlot,
    Order,
    OrderItem,
    OrderStatus,
    Product,
    User,
    UserRole,
)

_sequence = itertools.count(1)


def make_product(
    db: Session,
    *,
    name: str | None = None,
    size: str = "1 Litre",
    price: str | Decimal = "60.00",
    is_available: bool = True,
    stock_quantity: int = 100,  # #92: plenty, unless a test wants a low stock
) -> Product:
    product = Product(
        name=name or f"Test Milk {next(_sequence)}",
        size=size,
        price=Decimal(price),
        is_available=is_available,
        stock_quantity=stock_quantity,
    )
    db.add(product)
    db.flush()
    return product


def make_customer(
    db: Session, *, name: str = "Test Customer", phone: str | None = None
) -> Customer:
    customer = Customer(name=name, phone=phone or f"9{next(_sequence):09d}")
    db.add(customer)
    db.flush()
    return customer


def make_order(
    db: Session,
    *,
    customer: Customer | None = None,
    items: list[tuple[Product, int]] | None = None,
    status: OrderStatus = OrderStatus.PLACED,
    user: User | None = None,
) -> Order:
    """An order with correct subtotals and total (price snapshot × quantity)."""
    # Create (and flush) the customer and default product BEFORE building the order
    # items: a flush while items are linked to a product but not yet in the session
    # makes SQLAlchemy skip them for that flush (SAWarning).
    customer = customer or make_customer(db)
    lines = items or [(make_product(db), 1)]
    order_items = [
        OrderItem(
            product=product,
            quantity=quantity,
            unit_price=product.price,
            subtotal=product.price * quantity,
        )
        for product, quantity in lines
    ]
    order = Order(
        customer=customer,
        items=order_items,
        total_amount=sum((item.subtotal for item in order_items), Decimal("0.00")),
        status=status,
        user_id=user.user_id if user else None,  # None = placed before #90 (guest)
    )
    db.add(order)
    db.flush()
    return order


TEST_PASSWORD = "milk1234"


def make_user(
    db: Session,
    *,
    username: str | None = None,
    email: str | None = None,
    full_name: str = "Test User",
    password: str = TEST_PASSWORD,
    role: UserRole = UserRole.USER,
    with_address: bool = True,
) -> User:
    """A user whose password is `password` (stored hashed, like real sign-ups).
    #102: with a default delivery address, so they can order (with_address=False for
    tests about having none)."""
    n = next(_sequence)
    user = User(
        full_name=full_name,
        email=email or f"user{n}@example.com",
        username=username or f"user{n}",
        password_hash=hash_password(password),
        role=role,
    )
    db.add(user)
    db.flush()
    if with_address:
        make_address(db, user, is_default=True)
    return user


def make_address(
    db: Session,
    user: User,
    *,
    label: str = "Home",
    house: str = "12-3 Sai Residency",
    street: str = "MG Road, Ameerpet",
    landmark: str | None = None,
    city: str = "Hyderabad",
    pincode: str = "500016",
    is_default: bool = False,
) -> Address:
    """A saved address (#102). Set is_default only when the user has no default yet."""
    address = Address(
        user_id=user.user_id,
        label=label,
        house=house,
        street=street,
        landmark=landmark,
        city=city,
        pincode=pincode,
        is_default=is_default,
    )
    db.add(address)
    db.flush()
    return address


def auth_header(user: User) -> dict[str, str]:
    """`Authorization: Bearer <token>` for this user, as the frontend sends it."""
    token, _ = create_access_token(user.user_id, user.role.value)
    return {"Authorization": f"Bearer {token}"}


# ---- Delivery slots (#100) ----


def standard_slot(db: Session) -> DeliverySlot:
    """The "Morning" 08:00–09:00 slot that the migration creates (capacity 50)."""
    query = select(DeliverySlot).where(DeliverySlot.start_time == time(8, 0))
    return db.scalars(query).one()


def make_slot(
    db: Session,
    *,
    name: str = "Test slot",
    capacity: int = 10,
    is_active: bool = True,
    start: time | None = None,
    minutes: int = 30,
) -> DeliverySlot:
    """A slot with unique times (a different start minute for every call)."""
    if start is None:
        n = next(_sequence) % 600
        start = (datetime(2000, 1, 1, 10, 0) + timedelta(minutes=n)).time()
    end = (
        datetime.combine(datetime(2000, 1, 1), start) + timedelta(minutes=minutes)
    ).time()
    slot = DeliverySlot(
        name=name,
        start_time=start,
        end_time=end,
        capacity=capacity,
        is_active=is_active,
    )
    db.add(slot)
    db.flush()
    return slot
