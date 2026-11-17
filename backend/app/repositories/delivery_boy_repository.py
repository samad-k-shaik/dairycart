"""Queries for delivery boys and their areas (#103). Flush-only writes."""

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models import DeliveryArea, DeliveryBoy


class DeliveryBoyRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_all(self) -> Sequence[DeliveryBoy]:
        """Active first, then by name; areas loaded in one extra query."""
        query = (
            select(DeliveryBoy)
            .options(selectinload(DeliveryBoy.areas))
            .order_by(DeliveryBoy.is_active.desc(), DeliveryBoy.name)
        )
        return self.db.scalars(query).all()

    def get(self, delivery_boy_id: int) -> DeliveryBoy | None:
        query = (
            select(DeliveryBoy)
            .options(selectinload(DeliveryBoy.areas))
            .where(DeliveryBoy.delivery_boy_id == delivery_boy_id)
        )
        return self.db.scalars(query).first()

    def get_by_user(self, user_id: int) -> DeliveryBoy | None:
        """#109: the delivery boy who logs in with this account, with his areas."""
        return self.db.scalar(
            select(DeliveryBoy)
            .options(selectinload(DeliveryBoy.areas))
            .where(DeliveryBoy.user_id == user_id)
        )

    def find_by_phone(self, phone: str, *, exclude_id: int | None = None) -> DeliveryBoy | None:
        query = select(DeliveryBoy).where(DeliveryBoy.phone == phone)
        if exclude_id is not None:
            query = query.where(DeliveryBoy.delivery_boy_id != exclude_id)
        return self.db.scalars(query.limit(1)).first()

    def find_area(self, pincode: str) -> DeliveryArea | None:
        """The area row for this PIN code (with its delivery boy), or None."""
        query = (
            select(DeliveryArea)
            .options(joinedload(DeliveryArea.delivery_boy))
            .where(DeliveryArea.pincode == pincode)
        )
        return self.db.scalars(query).first()

    def active_allocation(self) -> dict[str, DeliveryBoy]:
        """PIN code → the ACTIVE delivery boy covering it (inactive ones are left out,
        so their areas count as not assigned). One query."""
        query = (
            select(DeliveryArea.pincode, DeliveryBoy)
            .join(DeliveryBoy, DeliveryBoy.delivery_boy_id == DeliveryArea.delivery_boy_id)
            .where(DeliveryBoy.is_active.is_(True))
        )
        return {pincode: boy for pincode, boy in self.db.execute(query).all()}

    def add(self, row: DeliveryBoy | DeliveryArea) -> None:
        self.db.add(row)
        self.db.flush()

    def delete(self, row: DeliveryBoy | DeliveryArea) -> None:
        self.db.delete(row)
        self.db.flush()
