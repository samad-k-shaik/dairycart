"""Address API schemas (#102, docs/05-api/api-contracts.md → Addresses)."""

from datetime import datetime
from typing import Annotated, Any, Self

from pydantic import BaseModel, ConfigDict, StringConstraints, model_validator

from app.models.address import PINCODE_PATTERN


def _text(min_length: int, max_length: int) -> Any:
    return Annotated[
        str,
        StringConstraints(
            strip_whitespace=True, min_length=min_length, max_length=max_length
        ),
    ]


Label = _text(2, 30)
House = _text(1, 100)
Street = _text(2, 150)
Landmark = _text(0, 100)
City = _text(2, 50)
Pincode = Annotated[
    str, StringConstraints(strip_whitespace=True, pattern=PINCODE_PATTERN)
]


class AddressCreate(BaseModel):
    """POST /addresses. `is_default: true` makes it the default (the first address
    always becomes the default)."""

    model_config = ConfigDict(extra="forbid")

    label: Label = "Home"
    house: House
    street: Street
    landmark: Landmark | None = None
    city: City
    pincode: Pincode
    is_default: bool = False

    def values(self) -> dict[str, Any]:
        data = self.model_dump(exclude={"is_default"})
        data["landmark"] = data["landmark"] or None  # "" → no landmark
        return data


class AddressUpdate(BaseModel):
    """PATCH /addresses/{id}: only the fields that change. `landmark` may be null or ""
    to remove it; the other fields cannot be null. The default is changed with
    POST /addresses/{id}/default."""

    model_config = ConfigDict(extra="forbid")

    label: Label | None = None
    house: House | None = None
    street: Street | None = None
    landmark: Landmark | None = None
    city: City | None = None
    pincode: Pincode | None = None

    @model_validator(mode="after")
    def _check_sent_fields(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("send at least one field to change")
        for field in self.model_fields_set - {"landmark"}:
            if getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self

    def changes(self) -> dict[str, Any]:
        data = self.model_dump(exclude_unset=True)
        if "landmark" in data:
            data["landmark"] = data["landmark"] or None
        return data


class AddressRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    address_id: int
    label: str
    house: str
    street: str
    landmark: str | None
    city: str
    pincode: str
    is_default: bool
    # The one-line text that orders copy.
    full_text: str
    created_at: datetime


class AddressChoice(BaseModel):
    """PATCH /subscriptions/{id}/address."""

    model_config = ConfigDict(extra="forbid")

    address_id: int
