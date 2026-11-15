"""DELIVERY_SLOTS table (#100, docs/04-architecture/database-erd.md).

A delivery slot is a time window, e.g. "Morning, 8:00 AM – 9:00 AM". Every subscription
books one slot; the admin creates the slots and decides how many ACTIVE subscriptions
each one can take (capacity). Two standard slots are created by the migration.
"""

from __future__ import annotations

from datetime import datetime, time

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    String,
    Time,
    UniqueConstraint,
    func,
    true,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base

# Largest capacity the admin may set (keeps typos like 50000 out).
MAX_SLOT_CAPACITY = 1000


def format_time(value: time) -> str:
    """08:00 → "8:00 AM", 17:30 → "5:30 PM" (the way customers read times)."""
    hour = value.hour % 12 or 12
    return f"{hour}:{value.minute:02d} {'AM' if value.hour < 12 else 'PM'}"


class DeliverySlot(Base):
    __tablename__ = "delivery_slots"
    __table_args__ = (
        CheckConstraint("end_time > start_time", name="end_after_start"),
        CheckConstraint(f"capacity BETWEEN 1 AND {MAX_SLOT_CAPACITY}", name="capacity_range"),
        # Two slots with exactly the same times would confuse customers.
        UniqueConstraint("start_time", "end_time", name="uq_delivery_slots_times"),
    )

    delivery_slot_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50))
    # TIME without a date or time zone: "08:00" means 8 AM India time every day.
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)
    # How many ACTIVE subscriptions may book this slot.
    capacity: Mapped[int]
    # Switched off: hidden from new subscribers; existing bookings keep it.
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=true(), default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    @property
    def label(self) -> str:
        """Like "Morning, 8:00 AM – 9:00 AM". Copied onto each delivery order."""
        return f"{self.name}, {format_time(self.start_time)} – {format_time(self.end_time)}"

    def __repr__(self) -> str:
        return f"DeliverySlot(delivery_slot_id={self.delivery_slot_id!r}, name={self.name!r})"
