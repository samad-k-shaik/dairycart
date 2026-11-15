"""Queries for delivery slots (#100). Flush-only writes: the service commits."""

from collections.abc import Sequence
from datetime import time

from sqlalchemy import ScalarSelect, exists, func, select
from sqlalchemy.orm import Session

from app.models import DeliverySlot, Subscription, SubscriptionStatus


def _booked() -> ScalarSelect[int]:
    """Number of ACTIVE subscriptions in the slot of the current row."""
    return (
        select(func.count(Subscription.subscription_id))
        .where(
            Subscription.delivery_slot_id == DeliverySlot.delivery_slot_id,
            Subscription.status == SubscriptionStatus.ACTIVE,
        )
        .correlate(DeliverySlot)
        .scalar_subquery()
    )


class DeliverySlotRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_with_booked(self, *, only_active: bool = False) -> list[tuple[DeliverySlot, int]]:
        """Slots by start time, each with its number of ACTIVE subscriptions."""
        query = select(DeliverySlot, _booked()).order_by(
            DeliverySlot.start_time, DeliverySlot.end_time
        )
        if only_active:
            query = query.where(DeliverySlot.is_active.is_(True))
        return [(slot, booked) for slot, booked in self.db.execute(query).all()]

    def get(self, slot_id: int) -> DeliverySlot | None:
        return self.db.get(DeliverySlot, slot_id)

    def get_for_update(self, slot_id: int) -> DeliverySlot | None:
        """LOCKS the slot until commit: two people booking the last place at the same
        moment are handled one after the other, so the slot is never overbooked."""
        query = select(DeliverySlot).where(DeliverySlot.delivery_slot_id == slot_id)
        return self.db.scalars(query.with_for_update()).first()

    def lock_active(self) -> Sequence[DeliverySlot]:
        """All active slots, LOCKED in id order. Used before switching one off, so two
        admins cannot switch off the last two slots at the same moment."""
        query = (
            select(DeliverySlot)
            .where(DeliverySlot.is_active.is_(True))
            .order_by(DeliverySlot.delivery_slot_id)
            .with_for_update()
        )
        return self.db.scalars(query).all()

    def booked_count(self, slot_id: int) -> int:
        query = select(func.count(Subscription.subscription_id)).where(
            Subscription.delivery_slot_id == slot_id,
            Subscription.status == SubscriptionStatus.ACTIVE,
        )
        return self.db.scalar(query) or 0

    def is_used(self, slot_id: int) -> bool:
        """True if any subscription (of any status) ever booked this slot."""
        query = select(exists().where(Subscription.delivery_slot_id == slot_id))
        return bool(self.db.scalar(query))

    def find_by_times(
        self, start: time, end: time, *, exclude_id: int | None = None
    ) -> DeliverySlot | None:
        query = select(DeliverySlot).where(
            DeliverySlot.start_time == start, DeliverySlot.end_time == end
        )
        if exclude_id is not None:
            query = query.where(DeliverySlot.delivery_slot_id != exclude_id)
        return self.db.scalars(query.limit(1)).first()

    def add(self, slot: DeliverySlot) -> DeliverySlot:
        self.db.add(slot)
        self.db.flush()
        return slot

    def delete(self, slot: DeliverySlot) -> None:
        self.db.delete(slot)
        self.db.flush()
