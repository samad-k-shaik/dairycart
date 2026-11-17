"""DELIVERY_LOCATIONS table (#110, ADR-018): where a delivery boy on a round is NOW.

ONE row per delivery boy, overwritten on every update (an "upsert"), because the maps only
need the latest position. There is no history: fewer rows, less personal data (NFR-17).
The row exists only while he is on a round; "Stop round" deletes it.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base
from app.models.map_pin import coordinate_type


class DeliveryLocation(Base):
    __tablename__ = "delivery_locations"
    __table_args__ = (
        CheckConstraint("latitude BETWEEN -90 AND 90", name="latitude_range"),
        CheckConstraint("longitude BETWEEN -180 AND 180", name="longitude_range"),
        CheckConstraint("accuracy_m >= 0", name="accuracy_non_negative"),
    )

    # The delivery boy is the key: at most one row each. CASCADE: deleting him deletes it.
    delivery_boy_id: Mapped[int] = mapped_column(
        ForeignKey("delivery_boys.delivery_boy_id", ondelete="CASCADE"), primary_key=True
    )
    latitude: Mapped[float] = mapped_column(coordinate_type())
    longitude: Mapped[float] = mapped_column(coordinate_type())
    # How precise the phone says the reading is, in metres (GPS ≈ 5–20, Wi-Fi ≈ 50+).
    accuracy_m: Mapped[int | None] = mapped_column(default=None)
    # When the PHONE read the position. Used to ignore readings that arrive late and out of
    # order (mobile data): an older reading never overwrites a newer one.
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    # When the SERVER saved it. Older than 2 minutes = "stale" on the maps (#111, #112).
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self) -> str:
        # No coordinates: a position is personal data and reprs end up in logs.
        return f"DeliveryLocation(delivery_boy_id={self.delivery_boy_id!r})"
