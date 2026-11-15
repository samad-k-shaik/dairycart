"""Create an ADMIN account, or make an existing user an admin (#89).

This is the ONLY way to get the ADMIN role: the API never gives it. Running this needs
access to the server and its database, which is the "authorized process".

    cd backend
    python -m app.scripts.create_admin --username admin --email admin@dairycart.local --full-name "Dairy Admin"
        → asks for the password twice (it is not shown and not saved in your shell history)

    python -m app.scripts.create_admin --promote ravi
        → makes the existing user "ravi" (username or email) an admin

For automation, the password can come from the ADMIN_PASSWORD environment variable.
"""

import argparse
import getpass
import os
import sys

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.database.session import SessionLocal
from app.models import User, UserRole
from app.repositories.user_repository import UserRepository
from app.schemas.auth import RegisterRequest


def promote(db: Session, login: str) -> User:
    """Give an existing user the ADMIN role. Raises LookupError if there is no such user."""
    user = UserRepository(db).find_by_login(login)
    if user is None:
        raise LookupError(f"No user with username or email '{login}'.")
    user.role = UserRole.ADMIN
    db.commit()
    return user


def create_admin(db: Session, data: RegisterRequest) -> User:
    """Create a new ADMIN account. Raises ValueError if the email or username is taken."""
    repository = UserRepository(db)
    if repository.email_taken(data.email) or repository.username_taken(data.username):
        raise ValueError(
            "That email or username already exists. Use --promote <username> instead."
        )
    user = repository.add(
        User(
            full_name=data.full_name,
            email=data.email,
            username=data.username,
            password_hash=hash_password(data.password),
            role=UserRole.ADMIN,
        )
    )
    db.commit()
    return user


def _ask_password() -> str:
    from_env = os.environ.get("ADMIN_PASSWORD")
    if from_env:
        return from_env
    first = getpass.getpass("Password for the new admin: ")
    if getpass.getpass("Repeat the password: ") != first:
        sys.exit("The passwords do not match. Nothing was changed.")
    return first


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Create or promote a DairyCart admin.")
    parser.add_argument("--promote", metavar="USERNAME_OR_EMAIL")
    parser.add_argument("--username")
    parser.add_argument("--email")
    parser.add_argument("--full-name")
    args = parser.parse_args(argv)

    with SessionLocal() as db:
        if args.promote:
            try:
                user = promote(db, args.promote)
            except LookupError as error:
                sys.exit(str(error))
            print(f"User '{user.username}' is now an ADMIN.")
            return

        if not (args.username and args.email and args.full_name):
            parser.error("give --username, --email and --full-name (or --promote)")
        try:
            data = RegisterRequest(
                full_name=args.full_name,
                email=args.email,
                username=args.username,
                password=_ask_password(),
            )
        except ValidationError as error:
            problems = "; ".join(f"{e['loc'][0]}: {e['msg']}" for e in error.errors())
            sys.exit(f"Not created: {problems}")
        try:
            user = create_admin(db, data)
        except ValueError as error:
            sys.exit(str(error))
        print(f"Admin '{user.username}' created. Log in at /login.")


if __name__ == "__main__":
    main()
