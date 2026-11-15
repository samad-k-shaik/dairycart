r"""Create an ADMIN account, or make an existing user an admin (#89; by mobile number: #121).

This is the ONLY way to get the ADMIN role: the API never gives it. Running this needs
access to the server and its database, which is the "authorized process".

    cd backend
    python -m app.scripts.create_admin --phone 9000000001 --full-name "Dairy Admin"
        → asks for the password twice (it is not shown and not saved in your shell history)

    python -m app.scripts.create_admin --promote 9876543210
        → makes the existing user with this mobile number an admin

For automation, the password can come from the ADMIN_PASSWORD environment variable.
"""

import argparse
import getpass
import os
import sys

from pydantic import TypeAdapter, ValidationError
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.database.session import SessionLocal
from app.models import User, UserRole
from app.repositories.user_repository import UserRepository
from app.schemas.auth import RegisterRequest
from app.schemas.common import MobileNumber


def promote(db: Session, phone: str) -> User:
    """Give an existing user the ADMIN role. Raises LookupError if there is no such user.
    `phone` is normalised like at login, so "+91 98765 43210" works too."""
    try:
        number = TypeAdapter(MobileNumber).validate_python(phone)
    except ValidationError as error:
        raise LookupError(f"'{phone}' is not a valid 10-digit mobile number.") from error
    user = UserRepository(db).get_by_phone(number)
    if user is None:
        raise LookupError(f"No user with mobile number {number}.")
    user.role = UserRole.ADMIN
    db.commit()
    return user


def create_admin(db: Session, data: RegisterRequest) -> User:
    """Create a new ADMIN account. Raises ValueError if the mobile number is taken."""
    repository = UserRepository(db)
    if repository.phone_taken(data.phone):
        raise ValueError(
            "That mobile number already has an account. Use --promote <mobile number> instead."
        )
    user = repository.add(
        User(
            full_name=data.full_name,
            phone=data.phone,
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
    parser.add_argument("--promote", metavar="MOBILE_NUMBER")
    parser.add_argument("--phone", help="10-digit mobile number: the admin logs in with it")
    parser.add_argument("--full-name")
    args = parser.parse_args(argv)

    with SessionLocal() as db:
        if args.promote:
            try:
                user = promote(db, args.promote)
            except LookupError as error:
                sys.exit(str(error))
            print(f"User '{user.full_name}' ({user.phone}) is now an ADMIN.")
            return

        if not (args.phone and args.full_name):
            parser.error("give --phone and --full-name (or --promote)")
        try:
            data = RegisterRequest(
                full_name=args.full_name,
                phone=args.phone,
                password=_ask_password(),
            )
        except ValidationError as error:
            problems = "; ".join(f"{e['loc'][0]}: {e['msg']}" for e in error.errors())
            sys.exit(f"Not created: {problems}")
        try:
            user = create_admin(db, data)
        except ValueError as error:
            sys.exit(str(error))
        print(f"Admin '{user.full_name}' created. Log in at /login with {user.phone}.")


if __name__ == "__main__":
    main()
