"""All ORM models, imported here so `Base.metadata` knows every table.

Alembic (M1-06) imports this package to discover the tables when generating migrations,
and SQLAlchemy needs all models loaded to resolve relationships by class name.
"""

from app.models.customer import Customer
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.models.product import Product
from app.models.subscription import (
    PLAN_DAYS,
    Subscription,
    SubscriptionItem,
    SubscriptionPlan,
    SubscriptionStatus,
)
from app.models.user import User, UserRole

__all__ = [
    "PLAN_DAYS",
    "Customer",
    "Order",
    "OrderItem",
    "OrderStatus",
    "Product",
    "Subscription",
    "SubscriptionItem",
    "SubscriptionPlan",
    "SubscriptionStatus",
    "User",
    "UserRole",
]
