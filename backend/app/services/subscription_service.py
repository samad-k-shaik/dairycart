"""Subscription business rules (#97).

- Subscribe: 7, 15 or 30 days of the same items, starting tomorrow at the earliest.
  Prices are LOCKED when subscribing; one ACTIVE subscription per user.
- Cancel: the owner (or an admin) stops it; future days get no orders. An order already
  created for today stays (the admin can still cancel that order, which restores stock).
- Delivery frequency (#99): every day, every 2nd or every 3rd day from the start date.
  The plan keeps its calendar length: 7 days every 2 days = 4 deliveries.
- Delivery time (#100): every subscription books a delivery slot (capacity checked in
  delivery_slot_service.book); "Change time" moves an ACTIVE plan to another slot. Each
  delivery order gets a text copy of the slot (orders.delivery_slot).
- Generate orders (#99: automatic, see app/core/background.py; the script is a backup):
  one normal order per ACTIVE subscription that delivers that day. Never twice for the
  same day; a day without enough stock is skipped and logged, and the subscription goes on.

"Today" is the date in India (IST, UTC+05:30, no daylight saving), not the server's.
"""

from dataclasses import dataclass, field
from datetime import UTC, date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import (
    InvalidFieldError,
    NotFoundError,
    SubscriptionAlreadyActiveError,
    SubscriptionNotActiveError,
)
from app.models import (
    PLAN_DAYS,
    Order,
    OrderItem,
    OrderStatus,
    Subscription,
    SubscriptionItem,
    SubscriptionStatus,
    User,
    UserRole,
)
from app.repositories.customer_repository import CustomerRepository
from app.repositories.order_repository import OrderRepository
from app.repositories.product_repository import ProductRepository
from app.repositories.subscription_repository import (
    AdminSubscriptionRow,
    SubscriptionRepository,
)
from app.schemas.common import ErrorDetail
from app.schemas.subscription import SubscriptionCreate
from app.services import address_service, delivery_slot_service
from app.services.order_service import check_items

IST = timezone(timedelta(hours=5, minutes=30), "IST")
# How far ahead a subscription may start.
MAX_DAYS_AHEAD = 30

ALREADY_ACTIVE_MESSAGE = (
    "You already have an active subscription. Cancel it before starting a new one."
)


def today_ist() -> date:
    return datetime.now(IST).date()


def end_date_for(start: date, days: int) -> date:
    """The last delivery day, included: 7 days from the 1st → the 7th."""
    return start + timedelta(days=days - 1)


# ---- Subscribe ----


def create_subscription(
    db: Session, data: SubscriptionCreate, user: User, today: date | None = None
) -> Subscription:
    today = today or today_ist()
    user_id = user.user_id  # read before any commit expires `user` (see create_order)
    first, last = today + timedelta(days=1), today + timedelta(days=MAX_DAYS_AHEAD)
    if not first <= data.start_date <= last:
        raise InvalidFieldError(
            f"The start date must be between {first:%d %b %Y} and {last:%d %b %Y}.",
            details=[ErrorDetail(field="start_date", issue="out of range")],
        )

    repository = SubscriptionRepository(db)
    try:
        repository.complete_finished(today)  # an ended plan must not block a new one
        if repository.has_active(user_id):
            raise SubscriptionAlreadyActiveError(ALREADY_ACTIVE_MESSAGE)

        # #100: the slot must be active and not full; it stays LOCKED until the commit.
        slot = delivery_slot_service.book(db, data.delivery_slot_id)
        # #102: where to deliver (text copy); 422 if the user has no address.
        address = address_service.delivery_copy_for(db, user_id, data.address_id)

        # Same checks as a one-time order (duplicates, unavailable, stock today).
        products = check_items(db, data.items)
        customers = CustomerRepository(db)
        customer = customers.get_by_phone(data.customer.phone) or customers.create(
            data.customer.name, data.customer.phone
        )
        items = [
            SubscriptionItem(
                product=products[requested.product_id],
                quantity=requested.quantity,
                unit_price=products[requested.product_id].price,  # locked price
                subtotal=products[requested.product_id].price * requested.quantity,
            )
            for requested in data.items
        ]
        days = PLAN_DAYS[data.plan]
        subscription = Subscription(
            user_id=user_id,
            customer=customer,
            plan=data.plan,
            start_date=data.start_date,
            end_date=end_date_for(data.start_date, days),
            every_n_days=data.every_n_days,
            delivery_slot=slot,
            delivery_address=address.text,
            delivery_pincode=address.pincode,  # #103
            status=SubscriptionStatus.ACTIVE,
            items=items,
            daily_total=sum((item.subtotal for item in items), Decimal("0.00")),
        )
        repository.add(subscription)
        db.commit()
    except IntegrityError as error:
        # Two subscribe requests at the same moment: the database's "one ACTIVE per
        # user" index lets only one of them in.
        db.rollback()
        raise SubscriptionAlreadyActiveError(ALREADY_ACTIVE_MESSAGE) from error
    except Exception:
        db.rollback()
        raise
    return _get(db, subscription.subscription_id)


# ---- Read ----


def _get(db: Session, subscription_id: int) -> Subscription:
    subscription = SubscriptionRepository(db).get_with_items(subscription_id)
    if subscription is None:
        raise NotFoundError(f"Subscription {subscription_id} was not found.")
    return subscription


def _can_see(subscription: Subscription | None, user: User) -> bool:
    return subscription is not None and (
        user.role == UserRole.ADMIN or subscription.user_id == user.user_id
    )


def order_count(db: Session, subscription_id: int) -> int:
    return SubscriptionRepository(db).order_counts([subscription_id])[subscription_id]


def _refresh_statuses(db: Session, today: date | None) -> None:
    """Mark plans whose last day has passed as COMPLETED before showing them."""
    try:
        if SubscriptionRepository(db).complete_finished(today or today_ist()):
            db.commit()
    except Exception:
        db.rollback()
        raise


def list_my_subscriptions(
    db: Session, user: User, today: date | None = None
) -> list[tuple[Subscription, int]]:
    """The user's subscriptions, newest first, each with its number of orders."""
    user_id = user.user_id
    _refresh_statuses(db, today)
    repository = SubscriptionRepository(db)
    subscriptions = repository.list_by_user(user_id)
    counts = repository.order_counts(s.subscription_id for s in subscriptions)
    return [(s, counts[s.subscription_id]) for s in subscriptions]


def get_subscription_for(
    db: Session, subscription_id: int, user: User, today: date | None = None
) -> Subscription:
    """Owner or ADMIN only; anyone else gets the same 404 as for a missing id."""
    _refresh_statuses(db, today)
    subscription = SubscriptionRepository(db).get_with_items(subscription_id)
    if not _can_see(subscription, user):
        raise NotFoundError(f"Subscription {subscription_id} was not found.")
    assert subscription is not None
    return subscription


def list_admin_subscriptions(
    db: Session,
    status: SubscriptionStatus | None,
    today: date | None = None,
    user_id: int | None = None,
) -> list[AdminSubscriptionRow]:
    _refresh_statuses(db, today)
    return SubscriptionRepository(db).list_admin(status, user_id)


# ---- Cancel ----


def cancel_subscription(
    db: Session, subscription_id: int, user: User, today: date | None = None
) -> Subscription:
    """Stop future deliveries. Orders already created are not touched."""
    is_admin, user_id = user.role == UserRole.ADMIN, user.user_id
    repository = SubscriptionRepository(db)
    try:
        repository.complete_finished(today or today_ist())
        subscription = repository.get_for_update(subscription_id)  # locked
        if subscription is None or not (is_admin or subscription.user_id == user_id):
            raise NotFoundError(f"Subscription {subscription_id} was not found.")
        if subscription.status != SubscriptionStatus.ACTIVE:
            raise SubscriptionNotActiveError(
                f"This subscription is already {subscription.status.value.lower()}."
            )
        subscription.status = SubscriptionStatus.CANCELLED
        subscription.cancelled_at = datetime.now(UTC)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return _get(db, subscription_id)


# ---- Change the delivery time (#100) ----


def change_delivery_slot(
    db: Session,
    subscription_id: int,
    slot_id: int,
    user: User,
    today: date | None = None,
) -> Subscription:
    """Move an ACTIVE subscription to another slot (owner or ADMIN). Orders already
    created keep their time; the next ones use the new slot."""
    is_admin, user_id = user.role == UserRole.ADMIN, user.user_id
    repository = SubscriptionRepository(db)
    try:
        repository.complete_finished(today or today_ist())
        subscription = repository.get_for_update(subscription_id)  # locked
        if subscription is None or not (is_admin or subscription.user_id == user_id):
            raise NotFoundError(f"Subscription {subscription_id} was not found.")
        if subscription.status != SubscriptionStatus.ACTIVE:
            raise SubscriptionNotActiveError(
                f"This subscription is {subscription.status.value.lower()}, "
                "so its delivery time cannot be changed."
            )
        if subscription.delivery_slot_id != slot_id:  # same slot: nothing to do
            subscription.delivery_slot = delivery_slot_service.book(db, slot_id)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return _get(db, subscription_id)


# ---- Change the delivery address (#102) ----


def change_address(
    db: Session,
    subscription_id: int,
    address_id: int,
    user: User,
    today: date | None = None,
) -> Subscription:
    """Copy another of the OWNER's saved addresses onto an ACTIVE subscription (owner
    only: an admin cannot pick from someone else's addresses). Orders already created
    keep their address; the next ones use the new one."""
    user_id = user.user_id
    repository = SubscriptionRepository(db)
    try:
        repository.complete_finished(today or today_ist())
        subscription = repository.get_for_update(subscription_id)  # locked
        if subscription is None or subscription.user_id != user_id:
            raise NotFoundError(f"Subscription {subscription_id} was not found.")
        if subscription.status != SubscriptionStatus.ACTIVE:
            raise SubscriptionNotActiveError(
                f"This subscription is {subscription.status.value.lower()}, "
                "so its address cannot be changed."
            )
        address = address_service.delivery_copy_for(db, user_id, address_id)
        subscription.delivery_address = address.text
        subscription.delivery_pincode = address.pincode  # #103
        db.commit()
    except Exception:
        db.rollback()
        raise
    return _get(db, subscription_id)


# ---- Generate the daily orders ----


@dataclass
class GenerateResult:
    delivery_date: date
    created: list[tuple[int, int]] = field(default_factory=list)  # (sub id, order id)
    already_created: int = 0
    skipped: list[tuple[int, str]] = field(default_factory=list)  # (sub id, reason)
    completed: int = 0


def generate_orders_for(db: Session, day: date) -> GenerateResult:
    """Create `day`'s order for every ACTIVE subscription that delivers on that day
    (inside its dates and on its every-n-days rhythm, #99).

    Safe to run again: subscriptions that already have their order for `day` are counted
    in `already_created`, and the database refuses a second order for the same
    subscription and day (uq_orders_subscription_day) even if two runs overlap.
    """
    result = GenerateResult(delivery_date=day)
    repository = SubscriptionRepository(db)
    try:
        result.completed = repository.complete_finished(day)
        done = repository.ids_with_order_on(day)
        for subscription in repository.due_on_for_update(day):
            if subscription.subscription_id in done:
                result.already_created += 1
                continue
            outcome = _create_daily_order(db, subscription, day)
            if isinstance(outcome, Order):
                result.created.append((subscription.subscription_id, outcome.order_id))
            elif outcome is None:
                result.already_created += 1
            else:
                result.skipped.append((subscription.subscription_id, outcome))
        db.commit()
    except Exception:
        db.rollback()
        raise
    return result


def _create_daily_order(
    db: Session, subscription: Subscription, day: date
) -> Order | str | None:
    """The order, or the reason it was skipped, or None if another run made it first."""
    quantities = {item.product_id: item.quantity for item in subscription.items}
    products = ProductRepository(db).get_many_for_update(quantities)  # locked
    for product_id, quantity in quantities.items():
        product = products[product_id]
        label = f"'{product.name} {product.size}'"
        if not product.is_available:
            return f"{label} is unavailable."
        if quantity > product.stock_quantity:
            return f"Not enough stock of {label}."

    # A SAVEPOINT: if this one insert fails, only this subscription's work is undone,
    # not the orders already created for other subscriptions in this run.
    savepoint = db.begin_nested()
    try:
        for product_id, quantity in quantities.items():
            products[product_id].stock_quantity -= quantity
        order = Order(
            customer_id=subscription.customer_id,
            user_id=subscription.user_id,
            subscription_id=subscription.subscription_id,
            delivery_date=day,
            # #100: a copy of the booked time, so later slot edits do not change it.
            delivery_slot=(
                subscription.delivery_slot.label if subscription.delivery_slot else None
            ),
            delivery_address=subscription.delivery_address,  # #102
            delivery_pincode=subscription.delivery_pincode,  # #103
            status=OrderStatus.PLACED,
            items=[
                OrderItem(
                    product=products[item.product_id],
                    quantity=item.quantity,
                    unit_price=item.unit_price,  # the price locked when subscribing
                    subtotal=item.subtotal,
                )
                for item in subscription.items
            ],
            total_amount=subscription.daily_total,
        )
        OrderRepository(db).add(order)
        savepoint.commit()
    except IntegrityError:
        savepoint.rollback()  # another run created this day's order first
        return None
    return order
