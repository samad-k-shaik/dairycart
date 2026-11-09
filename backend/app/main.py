"""Application entry point.

Uvicorn (the ASGI server) imports this module and runs the ``app`` object:

    uvicorn app.main:app --reload --port 8000

Later M1 issues add routers here.
No database code or business logic belongs in this file.
"""

from fastapi import FastAPI

from app.core.config import get_settings
from app.core.errors import register_error_handlers
from app.core.logging import RequestIdMiddleware, configure_logging

# Fail fast: read and validate the configuration while the app loads. If DATABASE_URL is
# missing or invalid, Uvicorn stops here with a readable SettingsError instead of starting
# a half-configured server that fails on the first database request.
settings = get_settings()

# JSON logs to stdout at LOG_LEVEL (M1-03).
configure_logging(settings.log_level)

# The FastAPI application. Title and version appear in the interactive docs at /docs.
app = FastAPI(title="Milk Delivery POC API", version="0.1.0")

# Runs around every request: request ID + X-Request-ID header + one JSON log line.
app.add_middleware(RequestIdMiddleware)

# Every error → {"error": {"code", "message", "details", "request_id"}} (M1-08).
register_error_handlers(app)


@app.get("/", tags=["meta"])
def read_root() -> dict[str, str]:
    """Temporary root route to show the API is running.

    Real endpoints live under /api/v1 and arrive in later issues (health in M1-09).
    """
    return {"name": "Milk Delivery POC API"}
