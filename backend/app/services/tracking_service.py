"""Live tracking (#110, ADR-018): delivery rounds and the delivery boy's latest position.

Write path of live tracking:
    phone (browser GPS) ──PUT /delivery/me/location every 10–15 s──► save_location ──► upsert

Privacy rules (NFR-17):
- A position is accepted ONLY while he is on a round (he pressed "Start round", which shows
  the consent text). Otherwise 409 ROUND_NOT_STARTED and nothing is stored.
- "Stop round" deletes his position. There is no history.
- Coordinates are never logged (the request log has the path only).
"""

from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.core.errors import RoundNotStartedError
from app.models import DeliveryBoy
from app.repositories.delivery_location_repository import DeliveryLocationRepository
from app.schemas.delivery import LocationUpdate

# A position older than this is shown greyed out ("stale") on the maps (#111, #112).
STALE_AFTER = timedelta(minutes=2)


def _now() -> datetime:
    return datetime.now(UTC)


def start_round(db: Session, boy: DeliveryBoy) -> DeliveryBoy:
    """Start sharing. Pressing it twice keeps the first start time."""
    try:
        if boy.round_started_at is None:
            boy.round_started_at = _now()
        db.commit()
    except Exception:
        db.rollback()
        raise
    return boy


def stop_round(db: Session, boy: DeliveryBoy) -> DeliveryBoy:
    """Stop sharing and forget where he is."""
    try:
        boy.round_started_at = None
        DeliveryLocationRepository(db).delete(boy.delivery_boy_id)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return boy


def save_location(
    db: Session, boy: DeliveryBoy, data: LocationUpdate, now: datetime | None = None
) -> bool:
    """Store his latest position. Returns False if it was older than the saved one (ignored).

    A phone clock that runs ahead is clamped to the server's time, so a wrong clock cannot
    block his later readings."""
    if boy.round_started_at is None:
        raise RoundNotStartedError(
            "Start your round first. Your location is only shared during a round."
        )
    recorded_at = min(data.recorded_at, now or _now())
    try:
        saved = DeliveryLocationRepository(db).upsert_if_newer(
            boy.delivery_boy_id, data.latitude, data.longitude, data.accuracy_m, recorded_at
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    return saved


def is_stale(updated_at: datetime, now: datetime | None = None) -> bool:
    """True when the last update is older than STALE_AFTER (the phone stopped sending:
    screen locked, no signal…)."""
    return (now or _now()) - updated_at > STALE_AFTER
