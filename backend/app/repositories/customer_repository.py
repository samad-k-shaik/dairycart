"""Queries for the customers table (M3-02)."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Customer


class CustomerRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_phone(self, phone: str) -> Customer | None:
        """The customer with this phone number (unique), or None."""
        return self.db.scalars(select(Customer).where(Customer.phone == phone)).first()

    def create(self, name: str, phone: str) -> Customer:
        customer = Customer(name=name, phone=phone)
        self.db.add(customer)
        self.db.flush()  # INSERT now, so customer.customer_id is known
        return customer
