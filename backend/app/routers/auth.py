"""Account endpoints (#89):

    POST /api/v1/auth/register   → create a USER account (201)
    POST /api/v1/auth/login      → username/email + password → token (200)
    GET  /api/v1/auth/me         → the logged-in user (needs the token)

Logout has no endpoint: the token is not stored on the server, so the frontend logs
out by deleting its copy. (A copied token stays valid until it expires; see ADR-013.)
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser
from app.database.session import get_db
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserRead
from app.schemas.common import ErrorResponse
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])

DbSession = Annotated[Session, Depends(get_db)]


def _error(description: str) -> dict:
    return {"model": ErrorResponse, "description": description}


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Sign up",
    responses={
        409: _error("USER_ALREADY_EXISTS: email or username already used"),
        422: _error("Invalid fields"),
    },
)
def register(data: RegisterRequest, db: DbSession) -> UserRead:
    """New accounts always get the USER role."""
    return UserRead.model_validate(auth_service.register(db, data))


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Log in",
    responses={401: _error("Invalid username/email or password")},
)
def login(data: LoginRequest, db: DbSession) -> TokenResponse:
    token, expires_in, user = auth_service.login(db, data.login, data.password)
    return TokenResponse(
        access_token=token, expires_in=expires_in, user=UserRead.model_validate(user)
    )


@router.get(
    "/me",
    response_model=UserRead,
    summary="The logged-in user",
    responses={401: _error("Missing, invalid or expired token")},
)
def me(user: CurrentUser) -> UserRead:
    return UserRead.model_validate(user)
