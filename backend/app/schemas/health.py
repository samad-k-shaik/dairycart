"""Response schema for GET /api/v1/health (docs/05-api/api-contracts.md)."""

from typing import Literal

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    database: Literal["ok", "unavailable"]
    version: str
