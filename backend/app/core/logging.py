"""Structured JSON logging and the request ID middleware (M1-03, NFR-13).

Every request gets a request ID (reused from an incoming ``X-Request-ID`` header if it
looks safe, otherwise a new UUID4). It is stored on ``request.state.request_id``, returned
in the ``X-Request-ID`` response header, and written on one JSON log line per request:

    {"severity": "INFO", "message": "request completed", "request_id": "...",
     "method": "GET", "path": "/", "status_code": 200, "duration_ms": 1.42, ...}

Logs go to stdout; on Cloud Run (M6) Cloud Logging reads them and understands the
"severity" and "message" keys. Dependency-free: Python's logging + json only.

Privacy: request bodies and query strings are NEVER logged (they can contain phone
numbers, e.g. /orders?phone=...). Only the path is logged.
"""

import json
import logging
import re
import sys
import time
import uuid
from contextvars import ContextVar
from datetime import UTC, datetime

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

REQUEST_ID_HEADER = "X-Request-ID"

# The current request's ID, visible to ANY log call made while handling that request,
# so every log line of one request can be found by its request_id (correlation ID).
request_id_var: ContextVar[str | None] = ContextVar("request_id", default=None)

# Extra fields copied from `logger.info(..., extra={...})` into the JSON line.
_EXTRA_FIELDS = ("method", "path", "status_code", "duration_ms")

# Accept an incoming ID only if it is short and plain (stops log injection / huge values).
_SAFE_REQUEST_ID = re.compile(r"^[A-Za-z0-9._-]{1,128}$")


class JsonFormatter(logging.Formatter):
    """Formats each log record as one line of JSON."""

    def format(self, record: logging.LogRecord) -> str:
        entry: dict[str, object] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=UTC).isoformat(),
            "severity": record.levelname,  # Cloud Logging reads "severity"
            "logger": record.name,
            "message": record.getMessage(),
        }
        request_id = getattr(record, "request_id", None) or request_id_var.get()
        if request_id:
            entry["request_id"] = request_id
        for field in _EXTRA_FIELDS:
            if hasattr(record, field):
                entry[field] = getattr(record, field)
        if record.exc_info:
            entry["exception"] = self.formatException(record.exc_info)
        # default=str: never crash on a value json cannot encode; ensure_ascii keeps one line.
        return json.dumps(entry, default=str)


def configure_logging(level: str) -> None:
    """Sends all logs to stdout as JSON at `level` (from the LOG_LEVEL setting).

    Safe to call more than once: it replaces its own handler instead of adding another.
    """
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())

    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level)

    # Uvicorn's own loggers: make them JSON too (via the root handler)...
    for name in ("uvicorn", "uvicorn.error"):
        uvicorn_logger = logging.getLogger(name)
        uvicorn_logger.handlers = []
        uvicorn_logger.propagate = True
    # ...and silence its access log: our middleware writes the one line per request,
    # so the plain-text "GET / 200" line would be a duplicate.
    access = logging.getLogger("uvicorn.access")
    access.handlers = []
    access.propagate = False
    access.disabled = True


def _incoming_or_new_request_id(request: Request) -> str:
    incoming = request.headers.get(REQUEST_ID_HEADER)
    if incoming and _SAFE_REQUEST_ID.fullmatch(incoming):
        return incoming  # reuse it, so the caller's ID and our logs match
    return str(uuid.uuid4())


request_logger = logging.getLogger("app.request")


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Runs around every request: assigns the request ID, times the request,
    adds the X-Request-ID header and writes one JSON log line."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        request_id = _incoming_or_new_request_id(request)
        request.state.request_id = request_id
        token = request_id_var.set(request_id)
        started = time.perf_counter()
        status_code = 500  # if the endpoint crashes, the log still says 500
        try:
            response = await call_next(request)
            status_code = response.status_code
            response.headers[REQUEST_ID_HEADER] = request_id
            return response
        finally:
            request_logger.info(
                "request completed",
                extra={
                    # On the record itself (not only the context variable), so the ID is
                    # kept even if a handler formats the record later.
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,  # path only: no query string (privacy)
                    "status_code": status_code,
                    "duration_ms": round((time.perf_counter() - started) * 1000, 2),
                },
            )
            request_id_var.reset(token)
