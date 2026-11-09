"""Domain exceptions and the handlers that turn every error into the standard JSON format
(M1-08, LLD §8, docs/05-api/api-contracts.md#error-format).

Services raise domain exceptions without knowing about HTTP:

    raise ProductUnavailableError("Product 'Buffalo Milk 1 Litre' is currently unavailable.",
                                  details=[ErrorDetail(field="items[1].product_id", issue="unavailable")])

`register_error_handlers(app)` maps them, FastAPI's validation errors, Starlette's HTTP errors
(unknown URL, wrong method) and any unexpected crash to:

    {"error": {"code", "message", "details", "request_id"}}

Unexpected crashes (500) are logged in full with the request ID, but the client only gets a
generic message: a stack trace would reveal code, file paths and library versions to attackers.
"""

import logging
from collections.abc import Sequence

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import REQUEST_ID_HEADER, request_id_var
from app.schemas.common import ErrorBody, ErrorDetail, ErrorResponse

logger = logging.getLogger("app.errors")


# ---- Domain exceptions (raised by services) ----


class DomainError(Exception):
    """Base class: an expected business error with an HTTP status and an error code."""

    status_code: int = 400
    code: str = "BAD_REQUEST"

    def __init__(self, message: str, details: Sequence[ErrorDetail] = ()) -> None:
        super().__init__(message)
        self.message = message
        self.details = list(details)


class NotFoundError(DomainError):
    """A product or order with this id does not exist."""

    status_code = 404
    code = "NOT_FOUND"


class ProductUnavailableError(DomainError):
    """The request is valid, but a product is not available right now (is_available = false)."""

    status_code = 409
    code = "PRODUCT_UNAVAILABLE"


class InvalidStatusTransitionError(DomainError):
    """The request is valid, but the order cannot move to that status (e.g. DELIVERED → PLACED)."""

    status_code = 409
    code = "INVALID_STATUS_TRANSITION"


class DuplicateProductError(DomainError):
    """The same product appears twice in one order (BR-4)."""

    status_code = 400
    code = "DUPLICATE_PRODUCT"


# ---- Building the response ----

INTERNAL_ERROR_MESSAGE = "Something went wrong on our side. Please try again."

_HTTP_ERRORS: dict[int, tuple[str, str]] = {
    404: ("NOT_FOUND", "The requested resource was not found."),
    405: ("METHOD_NOT_ALLOWED", "This method is not allowed for this URL."),
}


def _request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None) or request_id_var.get()


def error_response(
    request: Request,
    status_code: int,
    code: str,
    message: str,
    details: Sequence[ErrorDetail] = (),
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    body = ErrorResponse(
        error=ErrorBody(
            code=code,
            message=message,
            details=list(details),
            request_id=_request_id(request),
        )
    )
    return JSONResponse(
        status_code=status_code, content=body.model_dump(), headers=headers
    )


def field_path(location: Sequence[str | int]) -> str:
    """("body", "items", 0, "quantity") → "items[0].quantity"; ("query", "page") → "page".

    The first part only says WHERE the value was (body, query, path, header, cookie).
    """
    parts: list[str] = []
    for index, part in enumerate(location):
        if index == 0 and part in {"body", "query", "path", "header", "cookie"}:
            continue
        if isinstance(part, int):
            if parts:
                parts[-1] += f"[{part}]"
            else:
                parts.append(f"[{part}]")
        else:
            parts.append(str(part))
    return ".".join(parts) or str(location[0] if location else "request")


# ---- Handlers ----


async def _domain_error(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, DomainError)
    return error_response(request, exc.status_code, exc.code, exc.message, exc.details)


async def _validation_error(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)
    # Only the field path and pydantic's message; never the submitted value (privacy).
    details = [
        ErrorDetail(field=field_path(e["loc"]), issue=e["msg"]) for e in exc.errors()
    ]
    return error_response(
        request, 422, "VALIDATION_ERROR", "Request validation failed.", details
    )


async def _http_error(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, StarletteHTTPException)
    code, message = _HTTP_ERRORS.get(
        exc.status_code, ("HTTP_ERROR", "The request failed.")
    )
    # Keep headers such as Allow (405).
    return error_response(request, exc.status_code, code, message, headers=exc.headers)


async def _unhandled_error(request: Request, exc: Exception) -> JSONResponse:
    request_id = _request_id(request)
    # Full traceback in the logs (with the request ID), nothing technical for the client.
    logger.exception(
        "unhandled error",
        exc_info=exc,
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
        },
    )
    # This handler runs outside the request-ID middleware, so add the header here.
    headers = {REQUEST_ID_HEADER: request_id} if request_id else None
    return error_response(
        request, 500, "INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, headers=headers
    )


def register_error_handlers(app: FastAPI) -> None:
    """Installs all handlers on the app (called from main.py)."""
    app.add_exception_handler(DomainError, _domain_error)
    app.add_exception_handler(RequestValidationError, _validation_error)
    app.add_exception_handler(StarletteHTTPException, _http_error)
    app.add_exception_handler(Exception, _unhandled_error)
