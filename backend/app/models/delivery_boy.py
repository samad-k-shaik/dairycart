"""DELIVERY_BOYS and DELIVERY_AREAS tables (#103, docs/04-architecture/database-erd.md).

The admin keeps a list of delivery boys (no login: they are records, not users) and
allocates areas to them. An area is a PIN code; each PIN code belongs to at most ONE
delivery boy (UNIQUE pincode). An order is matched to a delivery boy through the PIN code
of its delivery address when the admin looks at the deliveries, so moving an area to
another delivery boy also moves that area's orders.

#109: a delivery boy can get a login. The admin creates a USERS row with the role
DELIVERY_BOY and the delivery boy's mobile number; `user_id` links the two.
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    func,
    true,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.address import PINCODE_PATTERN

if TYPE_CHECKING:  # imported only for type hints, avoids circular imports at runtime
    from app.models.user import User


class DeliveryBoy(Base):
    __tablename__ = "delivery_boys"
    __table_args__ = (
        UniqueConstraint("phone", name="uq_delivery_boys_phone"),
        CheckConstraint("phone ~ '^[6-9][0-9]{9}$'", name="phone_format"),
    )

    delivery_boy_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    # 10-digit Indian mobile number, like customers' phones.
    phone: Mapped[str] = mapped_column(String(10))
    # Inactive: keeps his areas, but his orders show as "Not assigned".
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=true(), default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    # #109: his login account (role DELIVERY_BOY), or NULL while he has none. UNIQUE: one
    # account per delivery boy. SET NULL: removing the account keeps the delivery boy.
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.user_id", ondelete="SET NULL"), unique=True, default=None
    )
    user: Mapped[User | None] = relationship()
    # #110: when he pressed "Start round"; NULL = not on a round, so his location is not
    # accepted (privacy, NFR-17). "Stop round" sets it back to NULL.
    round_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)

    areas: Mapped[list[DeliveryArea]] = relationship(
        back_populates="delivery_boy",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="DeliveryArea.pincode",
    )

    def __repr__(self) -> str:
        # No phone number: personal data.
        return f"DeliveryBoy(delivery_boy_id={self.delivery_boy_id!r}, name={self.name!r})"


class DeliveryArea(Base):
    """One PIN code allocated to one delivery boy."""

    __tablename__ = "delivery_areas"
    __table_args__ = (
        # One delivery boy per PIN code (#103).
        UniqueConstraint("pincode", name="uq_delivery_areas_pincode"),
        CheckConstraint(f"pincode ~ '{PINCODE_PATTERN}'", name="pincode_format"),
        Index("idx_delivery_areas_delivery_boy_id", "delivery_boy_id"),
    )

    delivery_area_id: Mapped[int] = mapped_column(primary_key=True)
    pincode: Mapped[str] = mapped_column(String(6))
    # Optional locality name shown next to the PIN code, e.g. "Ameerpet".
    area_name: Mapped[str | None] = mapped_column(String(50), default=None)
    # CASCADE: deleting a delivery boy frees his areas.
    delivery_boy_id: Mapped[int] = mapped_column(
        ForeignKey("delivery_boys.delivery_boy_id", ondelete="CASCADE")
    )

    delivery_boy: Mapped[DeliveryBoy] = relationship(back_populates="areas")
