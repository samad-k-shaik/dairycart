"""Delivery locations (#110): one row per delivery boy, written with an upsert."""

from datetime import datetime

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models import DeliveryLocation


class DeliveryLocationRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, delivery_boy_id: int) -> DeliveryLocation | None:
        return self.db.get(DeliveryLocation, delivery_boy_id)

    def upsert_if_newer(
        self,
        delivery_boy_id: int,
        latitude: float,
        longitude: float,
        accuracy_m: int | None,
        recorded_at: datetime,
    ) -> bool:
        """Save the position: INSERT the first time, UPDATE afterwards, in ONE statement
        (PostgreSQL `INSERT … ON CONFLICT … DO UPDATE`), so two requests at the same moment
        cannot create two rows or fail.

        The UPDATE only happens if this reading is NEWER than the saved one: a request that
        arrives late (slow mobile data) never moves the pin back. Returns False when the
        reading was ignored for that reason. Does not commit."""
        values = {
            "delivery_boy_id": delivery_boy_id,
            "latitude": latitude,
            "longitude": longitude,
            "accuracy_m": accuracy_m,
            "recorded_at": recorded_at,
        }
        statement = insert(DeliveryLocation).values(**values)
        statement = statement.on_conflict_do_update(
            index_elements=[DeliveryLocation.delivery_boy_id],
            set_={**values, "updated_at": func.now()},
            where=DeliveryLocation.recorded_at < statement.excluded.recorded_at,
        ).returning(DeliveryLocation.delivery_boy_id)
        return self.db.execute(statement).first() is not None

    def delete(self, delivery_boy_id: int) -> None:
        self.db.execute(
            delete(DeliveryLocation).where(DeliveryLocation.delivery_boy_id == delivery_boy_id)
        )

    def list_all(self) -> list[DeliveryLocation]:
        return list(self.db.scalars(select(DeliveryLocation)))
