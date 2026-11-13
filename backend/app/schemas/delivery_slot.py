"""Delivery slot API schemas (#100, docs/05-api/api-contracts.md → Delivery slots).

Times are "HH:MM" (24-hour, India time), e.g. "08:00" and "17:30". The API sends them
back as "08:00:00" (pydantic's standard time format).
"""

from datetime import time
from typing import Annotated, Any, Self

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    model_validator,
)

from app.models import MAX_SLOT_CAPACITY, DeliverySlot


def _whole_minutes(value: time) -> time:
    """08:00 and 08:30 are fine; 08:00:15 is not a time anyone books."""
    if value.second or value.microsecond:
        raise ValueError("use hours and minutes only, e.g. 08:00")
    if value.tzinfo is not None:
        raise ValueError("send the time without a time zone (India time)")
    return value


SlotTime = Annotated[time, AfterValidator(_whole_minutes)]
SlotName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=2, max_length=50)
]
Capacity = Annotated[int, Field(ge=1, le=MAX_SLOT_CAPACITY)]


# ---- Responses ----


class DeliverySlotRead(BaseModel):
    """A slot as customers see it (GET /delivery-slots) and inside a subscription."""

    delivery_slot_id: int
    name: str
    start_time: time
    end_time: time
    # "Morning, 8:00 AM – 9:00 AM"
    label: str
    # How many more subscriptions can book it (never below 0), and whether it is full.
    spaces_left: int
    is_full: bool

    @classmethod
    def from_slot(cls, slot: DeliverySlot, booked: int) -> Self:
        spaces_left = max(slot.capacity - booked, 0)
        return cls(
            delivery_slot_id=slot.delivery_slot_id,
            name=slot.name,
            start_time=slot.start_time,
            end_time=slot.end_time,
            label=slot.label,
            spaces_left=spaces_left,
            is_full=spaces_left == 0,
        )


class BookedSlotRead(BaseModel):
    """The slot a subscription booked (no "spaces left": the user already has a place)."""

    model_config = ConfigDict(from_attributes=True)

    delivery_slot_id: int
    name: str
    start_time: time
    end_time: time
    label: str
    is_active: bool


class AdminDeliverySlotRead(DeliverySlotRead):
    """What the admin sees: also the capacity, the bookings and on/off."""

    capacity: int
    booked: int
    is_active: bool

    @classmethod
    def from_slot(cls, slot: DeliverySlot, booked: int) -> Self:
        base = DeliverySlotRead.from_slot(slot, booked)
        return cls(
            **base.model_dump(),
            capacity=slot.capacity,
            booked=booked,
            is_active=slot.is_active,
        )


# ---- Requests ----


class DeliverySlotCreate(BaseModel):
    """POST /admin/delivery-slots."""

    model_config = ConfigDict(extra="forbid")

    name: SlotName
    start_time: SlotTime
    end_time: SlotTime
    capacity: Capacity
    is_active: bool = True

    @model_validator(mode="after")
    def _end_after_start(self) -> Self:
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class DeliverySlotUpdate(BaseModel):
    """PATCH /admin/delivery-slots/{id}: send only the fields that change (like products).
    "end after start" is checked in the service, where the saved times are known."""

    model_config = ConfigDict(extra="forbid")

    name: SlotName | None = None
    start_time: SlotTime | None = None
    end_time: SlotTime | None = None
    capacity: Capacity | None = None
    is_active: bool | None = None

    @model_validator(mode="after")
    def _check_sent_fields(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("send at least one field to change")
        for field in self.model_fields_set:
            if getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self

    def changes(self) -> dict[str, Any]:
        return self.model_dump(exclude_unset=True)


class DeliverySlotChange(BaseModel):
    """PATCH /subscriptions/{id}/delivery-slot."""

    model_config = ConfigDict(extra="forbid")

    delivery_slot_id: int = Field(gt=0)
