"""Queries for saved addresses (#102). Flush-only writes: the service commits."""

from collections.abc import Sequence

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Address


class AddressRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_by_user(self, user_id: int) -> Sequence[Address]:
        """The default first, then oldest first."""
        query = (
            select(Address)
            .where(Address.user_id == user_id)
            .order_by(Address.is_default.desc(), Address.address_id)
        )
        return self.db.scalars(query).all()

    def lock_user_addresses(self, user_id: int) -> Sequence[Address]:
        """All of the user's addresses, LOCKED until commit (in id order), so two
        requests changing the default at once are handled one after the other."""
        query = (
            select(Address)
            .where(Address.user_id == user_id)
            .order_by(Address.address_id)
            .with_for_update()
        )
        return self.db.scalars(query).all()

    def get_for_user(self, address_id: int, user_id: int) -> Address | None:
        """The address only if it belongs to this user (else None)."""
        query = select(Address).where(
            Address.address_id == address_id, Address.user_id == user_id
        )
        return self.db.scalars(query).first()

    def get_default(self, user_id: int) -> Address | None:
        query = select(Address).where(
            Address.user_id == user_id, Address.is_default.is_(True)
        )
        return self.db.scalars(query).first()

    def count(self, user_id: int) -> int:
        query = select(func.count(Address.address_id)).where(Address.user_id == user_id)
        return self.db.scalar(query) or 0

    def add(self, address: Address) -> Address:
        self.db.add(address)
        self.db.flush()
        return address

    def delete(self, address: Address) -> None:
        self.db.delete(address)
        self.db.flush()
