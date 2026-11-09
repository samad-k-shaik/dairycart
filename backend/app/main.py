"""Application entry point.

Uvicorn (the ASGI server) imports this module and runs the ``app`` object:

    uvicorn app.main:app --reload --port 8000

It wires things together (settings, logging, error handlers, routers) and holds no
database code or business logic. All endpoints live under /api/v1.
"""

from fastapi import FastAPI

from app import __version__
from app.core.config import get_settings
from app.core.errors import register_error_handlers
from app.core.logging import RequestIdMiddleware, configure_logging
from app.routers import health

API_PREFIX = "/api/v1"

# Fail fast: read and validate the configuration while the app loads. If DATABASE_URL is
# missing or invalid, Uvicorn stops here with a readable SettingsError instead of starting
# a half-configured server that fails on the first database request.
settings = get_settings()

# JSON logs to stdout at LOG_LEVEL (M1-03).
configure_logging(settings.log_level)

# The FastAPI application. Title and version appear in the interactive docs at /docs.
app = FastAPI(title="Milk Delivery POC API", version=__version__)

# Runs around every request: request ID + X-Request-ID header + one JSON log line.
app.add_middleware(RequestIdMiddleware)

# Every error → {"error": {"code", "message", "details", "request_id"}} (M1-08).
register_error_handlers(app)

# Routers (HTTP only; they call services).
app.include_router(health.router, prefix=API_PREFIX)
