"""Queries for the users table (#89; looked up by mobile number since #121)."""

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import User


class UserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, user_id: int) -> User | None:
        return self.db.get(User, user_id)

    def get_by_phone(self, phone: str) -> User | None:
        """The user whose login is this mobile number (10 digits, already normalised by
        the schema)."""
        return self.db.scalars(select(User).where(User.phone == phone)).first()

    def phone_taken(self, phone: str) -> bool:
        return self.db.scalar(select(User.user_id).where(User.phone == phone)) is not None

    def list_all(self) -> Sequence[User]:
        """Every user, oldest first."""
        return self.db.scalars(select(User).order_by(User.user_id)).all()

    def add(self, user: User) -> User:
        self.db.add(user)
        self.db.flush()
        return user
