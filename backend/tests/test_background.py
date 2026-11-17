"""The automatic subscription orders job (#99): the loop keeps running, survives errors,
and stops cleanly with the server. The database part (one run) is tested in
tests/api/test_subscriptions.py::test_automatic_run_creates_todays_orders_once."""

import asyncio

import pytest

from app.core.background import run_in_background, subscription_orders_loop


def test_loop_runs_at_start_and_then_again() -> None:
    calls: list[int] = []

    async def scenario() -> None:
        async with run_in_background(
            subscription_orders_loop(0.01, run_once=lambda: calls.append(1))
        ):
            await asyncio.sleep(0.5)

    asyncio.run(scenario())

    assert len(calls) >= 2  # once at start, then again (Windows timers are coarse)


def test_an_error_is_logged_and_the_loop_goes_on(
    caplog: pytest.LogCaptureFixture,
) -> None:
    calls: list[int] = []

    def flaky() -> None:
        calls.append(1)
        if len(calls) == 1:
            raise RuntimeError("database down")

    async def scenario() -> None:
        async with run_in_background(subscription_orders_loop(0.01, run_once=flaky)):
            await asyncio.sleep(0.5)

    asyncio.run(scenario())

    assert len(calls) >= 2  # the first failure did not stop it
    assert "subscription orders run failed" in caplog.text


def test_stopping_the_server_stops_the_loop() -> None:
    async def scenario() -> asyncio.Task[None]:
        async with run_in_background(subscription_orders_loop(60, run_once=lambda: None)) as task:
            await asyncio.sleep(0.05)
        return task

    task = asyncio.run(scenario())

    assert task.cancelled()


def test_tests_never_start_the_job() -> None:
    """conftest.py turns it off, so no test writes to the database in the background."""
    from app.core.config import get_settings

    assert get_settings().subscription_auto_orders is False
