"""Sign-up, login and user schemas (#89; mobile number instead of email/username: #121)."""

from typing import Annotated

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
)

from app.models import UserRole
from app.schemas.common import MobileNumber, Money, UtcDateTime

PASSWORD_MIN = 8
PASSWORD_MAX_BYTES = 72  # bcrypt ignores everything after 72 bytes


def _password_rules(value: str) -> str:
    if len(value.encode("utf-8")) > PASSWORD_MAX_BYTES:
        raise ValueError("password must be at most 72 bytes")
    if not any(c.isalpha() for c in value) or not any(c.isdigit() for c in value):
        raise ValueError("password must contain at least one letter and one number")
    return value


FullName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=100)]
# Not stripped: spaces in a password are allowed and count.
Password = Annotated[str, Field(min_length=PASSWORD_MIN), AfterValidator(_password_rules)]


class RegisterRequest(BaseModel):
    """POST /auth/register. There is no `role` field: everyone who signs up is a USER.
    (`extra="forbid"` turns an attempt to send "role": "ADMIN" into a 422.)"""

    model_config = ConfigDict(extra="forbid")

    full_name: FullName
    # The login of the account (#121). Saved as 10 digits ("+91 98765 43210" → "9876543210").
    phone: MobileNumber
    password: Password


class LoginRequest(BaseModel):
    """POST /auth/login: the mobile number used at sign-up + the password (#121).

    A badly typed number is a 422 here (it can never match an account), which tells the
    caller nothing about which numbers are registered."""

    model_config = ConfigDict(extra="forbid")

    phone: MobileNumber
    password: Annotated[str, Field(min_length=1)]


class UserRead(BaseModel):
    """A user as the API returns it. Never the password hash."""

    model_config = ConfigDict(from_attributes=True)

    user_id: int
    full_name: str
    phone: str
    role: UserRole
    created_at: UtcDateTime


class TokenResponse(BaseModel):
    """POST /auth/login → the token to send as `Authorization: Bearer <access_token>`."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: UserRead


class AdminUserDetail(UserRead):
    """GET /admin/users/{id} (#101): the user plus their order totals."""

    order_count: int
    # Sum of the user's orders that are not cancelled.
    total_spent: Money
