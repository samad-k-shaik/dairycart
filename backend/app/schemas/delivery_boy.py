"""Delivery boy API schemas (#103, docs/05-api/api-contracts.md → Delivery boys)."""

from typing import Annotated, Any, Self

from pydantic import BaseModel, ConfigDict, StringConstraints, model_validator

from app.models.address import PINCODE_PATTERN
from app.schemas.auth import Password
from app.schemas.common import Phone, UtcDateTime
from app.schemas.order import CustomerName

Pincode = Annotated[str, StringConstraints(strip_whitespace=True, pattern=PINCODE_PATTERN)]
AreaName = Annotated[str, StringConstraints(strip_whitespace=True, max_length=50)]


# ---- Requests ----


class DeliveryBoyCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: CustomerName  # 2–100 characters, trimmed
    phone: Phone  # 10-digit Indian mobile number
    is_active: bool = True


class DeliveryBoyUpdate(BaseModel):
    """PATCH: only the fields that change (at least one, none null)."""

    model_config = ConfigDict(extra="forbid")

    name: CustomerName | None = None
    phone: Phone | None = None
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


class AreaCreate(BaseModel):
    """POST /admin/delivery-boys/{id}/areas"""

    model_config = ConfigDict(extra="forbid")

    pincode: Pincode
    # Optional locality name, e.g. "Ameerpet" ("" = none).
    area_name: AreaName | None = None


# ---- Responses ----


class AreaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    pincode: str
    area_name: str | None


class DeliveryBoyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    delivery_boy_id: int
    name: str
    phone: str
    is_active: bool
    areas: list[AreaRead]
    created_at: UtcDateTime
    # Orders in his areas today (India time), cancelled ones not counted; 0 when
    # inactive (his orders show as "Not assigned").
    today_orders: int = 0
    # #109: true when he has a login (he logs in with `phone`).
    has_login: bool = False


class DeliveryLoginSet(BaseModel):
    """PUT /admin/delivery-boys/{id}/login (#109): create his login, or set a new password.
    He logs in with his mobile number (`phone`) and this password. The password rules are
    the same as for sign-up."""

    model_config = ConfigDict(extra="forbid")

    password: Password
