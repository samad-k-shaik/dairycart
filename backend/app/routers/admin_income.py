"""Admin Income tab (#105). ADMIN only (401 without a token, 403 for a USER).

    GET /api/v1/admin/income?from=YYYY-MM-DD&to=YYYY-MM-DD

Default period: this month so far (India time). The rules are in
services/income_service.py.
"""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.auth import require_admin
from app.core.india_time import today_ist
from app.database.session import get_db
from app.schemas.common import ErrorResponse
from app.schemas.income import IncomeReport
from app.services import income_service

router = APIRouter(
    prefix="/admin/income",
    tags=["admin income"],
    dependencies=[Depends(require_admin)],
    responses={
        401: {"model": ErrorResponse, "description": "Not logged in"},
        403: {"model": ErrorResponse, "description": "Not an administrator"},
    },
)


@router.get(
    "",
    response_model=IncomeReport,
    summary="Income overview for a period",
    responses={422: {"model": ErrorResponse, "description": "Bad dates or > 366 days"}},
)
def income(
    db: Annotated[Session, Depends(get_db)],
    start: Annotated[
        date | None,
        Query(alias="from", description="First day (default: 1st of this month)"),
    ] = None,
    end: Annotated[
        date | None, Query(alias="to", description="Last day (default: today)")
    ] = None,
) -> IncomeReport:
    """Income = DELIVERED orders. Compared with the previous period of the same length."""
    today = today_ist()
    return income_service.income_report(db, start or today.replace(day=1), end or today)
