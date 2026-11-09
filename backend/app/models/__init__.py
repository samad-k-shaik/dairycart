"""All ORM models, imported here so `Base.metadata` knows every table.

Alembic (M1-06) imports this package to discover the tables when generating migrations,
and SQLAlchemy needs all models loaded to resolve relationships by class name.
"""

from app.models.customer import Customer
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.models.product import Product

__all__ = ["Customer", "Order", "OrderItem", "OrderStatus", "Product"]
