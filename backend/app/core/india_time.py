"""India time helpers (moved here in #104 so any service can use them without importing
another service: subscription_service ↔ order_service would be a circular import).

"Today" is the date in India (IST, UTC+05:30, no daylight saving), not the server's. A
fixed offset is used instead of zoneinfo, which would need the tzdata package on Windows.
"""

from datetime import date, datetime, time, timedelta, timezone

IST = timezone(timedelta(hours=5, minutes=30), "IST")


def today_ist() -> date:
    return datetime.now(IST).date()


def india_day_range(day: date) -> tuple[datetime, datetime]:
    """[midnight, next midnight) of `day` in India, as time-zone-aware datetimes.
    00:00 IST = 18:30 UTC the day before."""
    starts = datetime.combine(day, time(0, 0), tzinfo=IST)
    return starts, starts + timedelta(days=1)
