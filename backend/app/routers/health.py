"""GET /api/v1/health: is the API up, and can it reach the database? (M1-09)

A READINESS check: 200 only if the database answers `SELECT 1`, otherwise 503 with
"degraded", so Docker, Cloud Run (M6) and smoke tests can tell a running-but-broken app
from a healthy one. It runs one trivial query, so it stays fast and cheap.
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app import __version__
from app.database.session import get_db
from app.schemas.health import HealthResponse

router = APIRouter(tags=["health"])
logger = logging.getLogger("app.health")


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="API and database health",
    responses={503: {"model": HealthResponse, "description": "Database unavailable"}},
)
def health(
    response: Response, db: Annotated[Session, Depends(get_db)]
) -> HealthResponse:
    # Health results must always be fresh, never served from a cache.
    response.headers["Cache-Control"] = "no-store"
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as error:
        # Expected failure mode, not a crash: answer 503 instead of a 500.
        # Log only the error type: the message can contain the host name.
        logger.warning("database health check failed: %s", type(error).__name__)
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return HealthResponse(
            status="degraded", database="unavailable", version=__version__
        )
    return HealthResponse(status="ok", database="ok", version=__version__)
