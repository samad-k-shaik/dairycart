"""Shared API schemas: the Money type and the single error response format
(docs/05-api/api-contracts.md).

Every non-2xx response has this shape:

    {"error": {"code": "NOT_FOUND", "message": "...", "details": [...], "request_id": "..."}}
"""

from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, Field, PlainSerializer

# Money in API responses: a decimal STRING with exactly 2 places, e.g. "60.00".
# JSON numbers become floats in JavaScript (60.00 → 60, 0.1 + 0.2 → 0.30000000000000004),
# so the contract sends money as text. In Python it stays an exact Decimal.
Money = Annotated[
    Decimal,
    PlainSerializer(lambda value: f"{value:.2f}", return_type=str, when_used="json"),
]


class ErrorDetail(BaseModel):
    """One problem with one field, e.g. field="items[0].quantity"."""

    field: str
    issue: str


class ErrorBody(BaseModel):
    code: str = Field(
        description="Machine-readable code, e.g. NOT_FOUND, VALIDATION_ERROR"
    )
    message: str = Field(description="Human-readable message, safe to show to users")
    details: list[ErrorDetail] = Field(default_factory=list)
    request_id: str | None = Field(
        default=None, description="Same as the X-Request-ID header; find it in the logs"
    )


class ErrorResponse(BaseModel):
    error: ErrorBody
