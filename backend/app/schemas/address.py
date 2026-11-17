"""Address API schemas (#102, docs/05-api/api-contracts.md → Addresses)."""

from datetime import datetime
from typing import Annotated, Any, Self

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

from app.models.address import PINCODE_PATTERN
from app.models.map_pin import COORDINATE_DECIMALS


def _text(min_length: int, max_length: int) -> Any:
    return Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=min_length, max_length=max_length),
    ]


Label = _text(2, 30)
House = _text(1, 100)
Street = _text(2, 150)
Landmark = _text(0, 100)
City = _text(2, 50)
Pincode = Annotated[str, StringConstraints(strip_whitespace=True, pattern=PINCODE_PATTERN)]
# #108: map pin in degrees. allow_inf_nan=False also refuses NaN and Infinity.
Latitude = Annotated[float, Field(ge=-90, le=90, allow_inf_nan=False)]
Longitude = Annotated[float, Field(ge=-180, le=180, allow_inf_nan=False)]


def _round_pin(data: dict[str, Any]) -> dict[str, Any]:
    """Keep 6 decimals (about 11 cm), what the database stores."""
    for field in ("latitude", "longitude"):
        if data.get(field) is not None:
            data[field] = round(data[field], COORDINATE_DECIMALS)
    return data


def _check_pin_pair(latitude: float | None, longitude: float | None) -> None:
    """Half a pin is meaningless: both or neither (the database checks this too)."""
    if (latitude is None) != (longitude is None):
        raise ValueError("send latitude and longitude together (or neither)")


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
    # #108: optional map pin; both or neither.
    latitude: Latitude | None = None
    longitude: Longitude | None = None
    is_default: bool = False

    @model_validator(mode="after")
    def _check_pin(self) -> Self:
        _check_pin_pair(self.latitude, self.longitude)
        return self

    def values(self) -> dict[str, Any]:
        data = self.model_dump(exclude={"is_default"})
        data["landmark"] = data["landmark"] or None  # "" → no landmark
        return _round_pin(data)


class AddressUpdate(BaseModel):
    """PATCH /addresses/{id}: only the fields that change. `landmark` may be null or ""
    to remove it; the other fields cannot be null. The default is changed with
    POST /addresses/{id}/default. The map pin (#108) changes as a pair: both values to
    move it, both null to remove it."""

    model_config = ConfigDict(extra="forbid")

    label: Label | None = None
    house: House | None = None
    street: Street | None = None
    landmark: Landmark | None = None
    city: City | None = None
    pincode: Pincode | None = None
    latitude: Latitude | None = None
    longitude: Longitude | None = None

    @model_validator(mode="after")
    def _check_sent_fields(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("send at least one field to change")
        pin = {"latitude", "longitude"}
        if self.model_fields_set & pin:
            if not pin <= self.model_fields_set:
                raise ValueError("send latitude and longitude together (or neither)")
            _check_pin_pair(self.latitude, self.longitude)
        for field in self.model_fields_set - {"landmark"} - pin:
            if getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self

    def changes(self) -> dict[str, Any]:
        data = self.model_dump(exclude_unset=True)
        if "landmark" in data:
            data["landmark"] = data["landmark"] or None
        return _round_pin(data)


class AddressRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    address_id: int
    label: str
    house: str
    street: str
    landmark: str | None
    city: str
    pincode: str
    # #108: the map pin, or null for both.
    latitude: float | None
    longitude: float | None
    is_default: bool
    # The one-line text that orders copy.
    full_text: str
    created_at: datetime


class AddressChoice(BaseModel):
    """PATCH /subscriptions/{id}/address."""

    model_config = ConfigDict(extra="forbid")

    address_id: int
