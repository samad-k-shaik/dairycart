"""Shared API schemas: the single error response format (docs/05-api/api-contracts.md#error-format).

Every non-2xx response has this shape:

    {"error": {"code": "NOT_FOUND", "message": "...", "details": [...], "request_id": "..."}}
"""

from pydantic import BaseModel, Field


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
