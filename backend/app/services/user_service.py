"""Admin view of one user (#101): their details, totals and orders."""

from dataclasses import dataclass
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.models import User
from app.repositories.order_repository import OrderRepository, OrderRow
from app.repositories.user_repository import UserRepository


@dataclass(frozen=True)
class UserSummary:
    user: User
    order_count: int
    # Sum of the user's orders that are not cancelled.
    total_spent: Decimal


def get_user(db: Session, user_id: int) -> User:
    user = UserRepository(db).get(user_id)
    if user is None:
        raise NotFoundError(f"User {user_id} was not found.")
    return user


def get_user_summary(db: Session, user_id: int) -> UserSummary:
    user = get_user(db, user_id)
    count, spent = OrderRepository(db).user_totals(user_id)
    return UserSummary(user=user, order_count=count, total_spent=spent)


def list_user_orders(db: Session, user_id: int) -> list[OrderRow]:
    """All of the user's orders, newest first (same list the user sees in My orders)."""
    get_user(db, user_id)  # 404 for an unknown user, not an empty list
    return OrderRepository(db).list_by_user(user_id)
