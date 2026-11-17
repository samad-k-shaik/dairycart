"""Shared API schemas: the Money type and the single error response format
(docs/05-api/api-contracts.md).

Every non-2xx response has this shape:

    {"error": {"code": "NOT_FOUND", "message": "...", "details": [...], "request_id": "..."}}
"""

import re
from datetime import UTC, datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, BeforeValidator, Field, PlainSerializer, StringConstraints

# Money in API responses: a decimal STRING with exactly 2 places, e.g. "60.00".
# JSON numbers become floats in JavaScript (60.00 → 60, 0.1 + 0.2 → 0.30000000000000004),
# so the contract sends money as text. In Python it stays an exact Decimal.
Money = Annotated[
    Decimal,
    PlainSerializer(lambda value: f"{value:.2f}", return_type=str, when_used="json"),
]


def _to_utc_string(value: datetime) -> str:
    """Any timezone → UTC, whole seconds: "2026-11-07T04:30:00Z" (the contract format).
    PostgreSQL returns TIMESTAMPTZ in the server's time zone, which may not be UTC."""
    return value.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


# Dates in API responses: ISO 8601 in UTC. The frontend shows them in India time.
UtcDateTime = Annotated[
    datetime, PlainSerializer(_to_utc_string, return_type=str, when_used="json")
]

# 10-digit Indian mobile number: starts with 6, 7, 8 or 9. Used at checkout, for delivery
# boys and (#121) as the login of a user account.
Phone = Annotated[str, StringConstraints(pattern=r"^[6-9]\d{9}$")]


def _normalise_mobile(value: object) -> object:
    """People type their number in many ways: "98765 43210", "+91 98765-43210",
    "098765 43210". Remove spaces and dashes and the +91 / 0 prefix, so the same number is
    always saved (and found at login) as the same 10 digits. Anything else is left as it
    is and then rejected by the Phone pattern."""
    if not isinstance(value, str):
        return value
    digits = re.sub(r"[\s-]", "", value)
    if digits.startswith("+91"):
        return digits[3:]
    if len(digits) == 11 and digits.startswith("0"):
        return digits[1:]
    return digits


# #121: the mobile number of a user account (sign-up, login, create_admin). Same rule as
# Phone, but forgiving about how it is typed.
MobileNumber = Annotated[Phone, BeforeValidator(_normalise_mobile)]


class ErrorDetail(BaseModel):
    """One problem with one field, e.g. field="items[0].quantity"."""

    field: str
    issue: str


class ErrorBody(BaseModel):
    code: str = Field(description="Machine-readable code, e.g. NOT_FOUND, VALIDATION_ERROR")
    message: str = Field(description="Human-readable message, safe to show to users")
    details: list[ErrorDetail] = Field(default_factory=list)
    request_id: str | None = Field(
        default=None, description="Same as the X-Request-ID header; find it in the logs"
    )


class ErrorResponse(BaseModel):
    error: ErrorBody
