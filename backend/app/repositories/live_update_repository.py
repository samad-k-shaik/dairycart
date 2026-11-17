"""#113: tell every backend instance that live data changed (PostgreSQL NOTIFY)."""

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.live_updates import CHANNEL


def notify_change(db: Session) -> None:
    """Queue a notification on the `live_updates` channel. PostgreSQL delivers it only when
    the current transaction COMMITS (and drops it on rollback), so listeners never hear about
    a change that did not happen. Call it just before db.commit()."""
    db.execute(text("SELECT pg_notify(:channel, '')"), {"channel": CHANNEL})
