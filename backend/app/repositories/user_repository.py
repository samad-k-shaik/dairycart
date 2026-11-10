"""Queries for the users table (#89)."""

from collections.abc import Sequence

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models import User


class UserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, user_id: int) -> User | None:
        return self.db.get(User, user_id)

    def find_by_login(self, login: str) -> User | None:
        """The user whose username OR email is `login` (both are stored in lower case)."""
        value = login.strip().lower()
        query = select(User).where(or_(User.username == value, User.email == value))
        return self.db.scalars(query).first()

    def email_taken(self, email: str) -> bool:
        return (
            self.db.scalar(select(User.user_id).where(User.email == email)) is not None
        )

    def username_taken(self, username: str) -> bool:
        query = select(User.user_id).where(User.username == username)
        return self.db.scalar(query) is not None

    def list_all(self) -> Sequence[User]:
        """Every user, oldest first."""
        return self.db.scalars(select(User).order_by(User.user_id)).all()

    def add(self, user: User) -> User:
        self.db.add(user)
        self.db.flush()
        return user
