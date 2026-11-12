"""Create the day's subscription orders from the command line (#97).

Does the same as the admin button "Create today's subscription orders". Safe to run more
than once a day: a subscription never gets two orders for the same day.

    cd backend
    python -m app.scripts.generate_subscription_orders              → today (India time)
    python -m app.scripts.generate_subscription_orders --date 2026-11-20
"""

import argparse
from datetime import date

from app.database.session import SessionLocal
from app.services.subscription_service import generate_orders_for, today_ist


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Create the day's subscription orders (#97)."
    )
    parser.add_argument(
        "--date",
        type=date.fromisoformat,
        default=None,
        help="Delivery day as YYYY-MM-DD (default: today in India)",
    )
    day = parser.parse_args(argv).date or today_ist()

    with SessionLocal() as db:
        result = generate_orders_for(db, day)

    print(f"Subscription orders for {result.delivery_date}:")
    print(f"  created:         {len(result.created)}")
    for subscription_id, order_id in result.created:
        print(f"    subscription #{subscription_id} -> order #{order_id}")
    print(f"  already created: {result.already_created}")
    print(f"  skipped:         {len(result.skipped)}")
    for subscription_id, reason in result.skipped:
        print(f"    subscription #{subscription_id}: {reason}")
    print(f"  completed plans: {result.completed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
