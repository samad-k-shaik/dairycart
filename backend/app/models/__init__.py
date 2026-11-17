"""All ORM models, imported here so `Base.metadata` knows every table.

Alembic (M1-06) imports this package to discover the tables when generating migrations,
and SQLAlchemy needs all models loaded to resolve relationships by class name.
"""

from app.models.address import MAX_ADDRESSES_PER_USER, Address
from app.models.customer import Customer
from app.models.delivery_boy import DeliveryArea, DeliveryBoy
from app.models.delivery_location import DeliveryLocation
from app.models.delivery_slot import MAX_SLOT_CAPACITY, DeliverySlot
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.models.product import Product
from app.models.subscription import (
    DELIVERY_INTERVALS,
    PLAN_DAYS,
    Subscription,
    SubscriptionItem,
    SubscriptionPlan,
    SubscriptionStatus,
)
from app.models.user import User, UserRole

__all__ = [
    "DELIVERY_INTERVALS",
    "MAX_ADDRESSES_PER_USER",
    "MAX_SLOT_CAPACITY",
    "PLAN_DAYS",
    "Address",
    "Customer",
    "DeliveryArea",
    "DeliveryBoy",
    "DeliveryLocation",
    "DeliverySlot",
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
