"""Sign-up, login and user schemas (#89)."""

from typing import Annotated

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
)

from app.models import UserRole
from app.schemas.common import UtcDateTime

PASSWORD_MIN = 8
PASSWORD_MAX_BYTES = 72  # bcrypt ignores everything after 72 bytes


def _password_rules(value: str) -> str:
    if len(value.encode("utf-8")) > PASSWORD_MAX_BYTES:
        raise ValueError("password must be at most 72 bytes")
    if not any(c.isalpha() for c in value) or not any(c.isdigit() for c in value):
        raise ValueError("password must contain at least one letter and one number")
    return value


FullName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=2, max_length=100)
]
# Simple shape check (something@something.something); the real proof that an email
# works would be a confirmation email, which is out of scope for the POC.
Email = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        to_lower=True,
        max_length=254,
        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
    ),
]
Username = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        to_lower=True,
        min_length=3,
        max_length=30,
        # Capitals allowed here: pydantic checks the pattern BEFORE to_lower, and the
        # value is then stored in lower case ("Ravi_K" → "ravi_k").
        pattern=r"^[A-Za-z0-9._-]+$",
    ),
]
# Not stripped: spaces in a password are allowed and count.
Password = Annotated[
    str, Field(min_length=PASSWORD_MIN), AfterValidator(_password_rules)
]


class RegisterRequest(BaseModel):
    """POST /auth/register. There is no `role` field: everyone who signs up is a USER.
    (`extra="forbid"` turns an attempt to send "role": "ADMIN" into a 422.)"""

    model_config = ConfigDict(extra="forbid")

    full_name: FullName
    email: Email
    username: Username
    password: Password


class LoginRequest(BaseModel):
    """POST /auth/login. `login` is the username OR the email address."""

    model_config = ConfigDict(extra="forbid")

    login: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    password: Annotated[str, Field(min_length=1)]


class UserRead(BaseModel):
    """A user as the API returns it. Never the password hash."""

    model_config = ConfigDict(from_attributes=True)

    user_id: int
    full_name: str
    email: str
    username: str
    role: UserRole
    created_at: UtcDateTime


class TokenResponse(BaseModel):
    """POST /auth/login → the token to send as `Authorization: Bearer <access_token>`."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: UserRead
