"""Background job: create subscription delivery orders automatically (#99).

Before #99 an admin had to press "Create today's subscription orders" every day. Now the
backend does it by itself: once when it starts, then every few minutes
(SUBSCRIPTION_ORDERS_INTERVAL_MINUTES, default 15).

Why running it so often is safe:
- `generate_orders_for(day)` skips subscriptions that already have their order for that
  day, and the database refuses a duplicate (UNIQUE subscription_id + delivery_date).
- Subscriptions and products are row-locked while orders are made, so two server workers
  running the job at the same moment cannot both create the same order.

It uses only the standard library (asyncio), no scheduler package (ADR-015). It runs only
while the server runs: after downtime, the next run creates today's orders, and a missed
day can be caught up with `python -m app.scripts.generate_subscription_orders --date ...`.
"""

import asyncio
import contextlib
import logging
from collections.abc import AsyncIterator, Callable, Coroutine
from contextlib import AbstractContextManager, asynccontextmanager
from typing import Any

from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.services.subscription_service import (
    GenerateResult,
    generate_orders_for,
    today_ist,
)

logger = logging.getLogger("app.subscriptions")


def run_subscription_orders_once(
    session_factory: Callable[[], AbstractContextManager[Session]] = SessionLocal,
) -> GenerateResult:
    """One run for today (India time). Logs what happened and returns it.

    `session_factory` is a parameter so tests can pass their own session.
    """
    with session_factory() as db:
        result = generate_orders_for(db, today_ist())
    if result.created or result.skipped or result.completed:
        logger.info(
            "subscription orders created",
            extra={
                "delivery_date": result.delivery_date.isoformat(),
                "orders_created": len(result.created),  # not "created": a LogRecord field
                "already_created": result.already_created,
                "skipped": [f"#{s}: {reason}" for s, reason in result.skipped],
                "completed": result.completed,
            },
        )
    return result


async def subscription_orders_loop(
    interval_seconds: float,
    run_once: Callable[[], object] = run_subscription_orders_once,
) -> None:
    """Run `run_once` now, then every `interval_seconds`, until cancelled.

    The database work is synchronous, so it runs in a worker thread (asyncio.to_thread)
    and never blocks the API. An error is logged and the loop tries again next time.
    """
    while True:
        try:
            await asyncio.to_thread(run_once)
        except Exception:
            logger.exception("subscription orders run failed; will retry")
        await asyncio.sleep(interval_seconds)


@asynccontextmanager
async def run_in_background(
    job: Coroutine[Any, Any, None],
) -> AsyncIterator[asyncio.Task[None]]:
    """Start `job` as a background task; cancel it cleanly when the block ends
    (when the server stops)."""
    task = asyncio.create_task(job)
    try:
        yield task
    finally:
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task
