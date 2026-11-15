"""Passwords and login tokens (#89, ADR-013).

Passwords: bcrypt.
    We store only a HASH: a one-way scramble. At login we hash what the user typed and
    compare. bcrypt adds a random "salt" (so two equal passwords get different hashes)
    and is deliberately slow (so guessing millions of passwords takes very long).
    bcrypt only reads the first 72 BYTES of a password; the schemas refuse longer ones.

Tokens: JWT (JSON Web Token), signed with HS256 and JWT_SECRET_KEY.
    After login the client gets a token like "eyJ...". It carries the user id ("sub")
    and an expiry time ("exp"). The signature proves WE made it: changing any letter
    (e.g. to become another user) makes the signature check fail. The token is not
    encrypted, so it never contains secrets, just the user id and role.
"""

from datetime import UTC, datetime, timedelta

import bcrypt
import jwt

from app.core.config import get_settings

ALGORITHM = "HS256"
# bcrypt "cost": 2^12 rounds (~0.2 s per hash). Slow on purpose, see above.
BCRYPT_ROUNDS = 12

# A real hash of a random password. Checking against it when the user does NOT exist
# makes "unknown user" take as long as "wrong password", so response times do not
# reveal which usernames exist.
_DUMMY_HASH = bcrypt.hashpw(b"no-such-user-password", bcrypt.gensalt(BCRYPT_ROUNDS))


def hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"), bcrypt.gensalt(BCRYPT_ROUNDS)
    ).decode("ascii")


def verify_password(password: str, password_hash: str | None) -> bool:
    """True if `password` matches the stored hash. With no hash (unknown user) it still
    does the same amount of work, then returns False."""
    candidate = password.encode("utf-8")
    if password_hash is None:
        bcrypt.checkpw(candidate, _DUMMY_HASH)
        return False
    return bcrypt.checkpw(candidate, password_hash.encode("ascii"))


def create_access_token(
    user_id: int, role: str, *, now: datetime | None = None
) -> tuple[str, int]:
    """A signed token for this user. Returns (token, seconds until it expires)."""
    settings = get_settings()
    issued = now or datetime.now(UTC)
    lifetime = timedelta(minutes=settings.jwt_expire_minutes)
    claims = {
        "sub": str(user_id),  # "subject": who the token is about (JWT wants a string)
        "role": role,  # for the frontend's convenience; the API re-reads the role from the DB
        "iat": issued,  # issued at
        "exp": issued + lifetime,  # expires at; PyJWT rejects the token after this
    }
    token = jwt.encode(
        claims, settings.jwt_secret_key.get_secret_value(), algorithm=ALGORITHM
    )
    return token, int(lifetime.total_seconds())


def read_access_token(token: str) -> int | None:
    """The user id inside a valid token, or None if the token is invalid or expired.

    `algorithms=[ALGORITHM]` is important: it stops tokens that claim another algorithm
    (e.g. "none", which has no signature at all) from being accepted.
    """
    try:
        claims = jwt.decode(
            token,
            get_settings().jwt_secret_key.get_secret_value(),
            algorithms=[ALGORITHM],
            options={"require": ["exp", "sub"]},
        )
        return int(claims["sub"])
    except (jwt.InvalidTokenError, ValueError):
        return None
