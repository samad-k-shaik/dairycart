"""Live updates (#113, ADR-018 / ADR-020): PostgreSQL LISTEN/NOTIFY + Server-Sent Events.

The problem: on Cloud Run there may be several copies (instances) of the backend. A
delivery boy's location can be saved by instance A while a customer's live stream is open
on instance B. B must learn that something changed.

The solution, with no new service (no Redis):

    instance A: save location → NOTIFY live_updates   (sent by PostgreSQL when A commits)
                                     │
    PostgreSQL delivers it to EVERY connection that ran  LISTEN live_updates
                                     │
    each instance: one listener thread (PgListener) → Broadcaster → wakes its open streams
                                                                   → each sends a fresh snapshot

The notification only says "something changed"; each stream then reads the current data
itself (sse_stream). If the listener is not running (tests, or it lost its connection), the
streams still re-check every HEARTBEAT_SECONDS, so the page is never stuck.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import threading
import time
from collections.abc import AsyncIterator, Callable

import psycopg
from starlette.concurrency import run_in_threadpool

logger = logging.getLogger(__name__)

# The NOTIFY channel. Every change that a live page shows sends one notification.
CHANNEL = "live_updates"
# A stream re-checks (and sends a ": ping" comment, so proxies keep the connection) this often.
HEARTBEAT_SECONDS = 15.0
# A stream ends after this long and the browser reconnects (Cloud Run closes requests at
# its timeout, at most 60 minutes, so we end cleanly before that).
STREAM_MAX_SECONDS = 25 * 60.0
# no-cache: never store the stream. X-Accel-Buffering: tell proxies (nginx) not to hold
# the events back in a buffer.
SSE_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}


class Broadcaster:
    """Wakes every open stream of THIS process. Thread-safe: the listener thread calls
    `publish_threadsafe`, the streams wait on asyncio Events in the event loop."""

    def __init__(self) -> None:
        self._subscribers: set[asyncio.Event] = set()
        self._loop: asyncio.AbstractEventLoop | None = None

    def attach(self, loop: asyncio.AbstractEventLoop | None) -> None:
        self._loop = loop

    def subscribe(self) -> asyncio.Event:
        event = asyncio.Event()
        self._subscribers.add(event)
        return event

    def unsubscribe(self, event: asyncio.Event) -> None:
        self._subscribers.discard(event)

    @property
    def subscriber_count(self) -> int:
        return len(self._subscribers)

    def _wake_all(self) -> None:
        for event in list(self._subscribers):
            event.set()

    def publish_threadsafe(self) -> None:
        """Called from the listener THREAD: hand the work over to the event loop."""
        if self._loop is not None and not self._loop.is_closed():
            self._loop.call_soon_threadsafe(self._wake_all)


broadcaster = Broadcaster()


def psycopg_conninfo(database_url: str) -> str:
    """SQLAlchemy's "postgresql+psycopg://…" → plain "postgresql://…" for psycopg."""
    return database_url.replace("postgresql+psycopg://", "postgresql://", 1)


class PgListener:
    """One background thread with its OWN database connection (a LISTENing connection
    cannot be shared with normal queries). Reconnects after errors."""

    def __init__(self, conninfo: str, target: Broadcaster) -> None:
        self._conninfo = conninfo
        self._target = target
        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._run, name="pg-listener", daemon=True)
        self.ready = threading.Event()  # set once LISTEN is active (used by tests)

    def start(self) -> None:
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        self._thread.join(timeout=5)

    def _run(self) -> None:
        while not self._stop.is_set():
            try:
                with psycopg.connect(self._conninfo, autocommit=True) as conn:
                    conn.execute(f"LISTEN {CHANNEL}")
                    self.ready.set()
                    while not self._stop.is_set():
                        # Wait up to 1 s for notifications, then check whether to stop.
                        for _ in conn.notifies(timeout=1.0):
                            self._target.publish_threadsafe()
            except Exception:  # database restarted, network…: wait, then reconnect
                self.ready.clear()
                logger.exception("live updates listener lost its connection; reconnecting")
                self._stop.wait(2.0)


@contextlib.asynccontextmanager
async def live_updates_listener(database_url: str) -> AsyncIterator[None]:
    """Run the listener while the server runs (used in main.py's lifespan)."""
    broadcaster.attach(asyncio.get_running_loop())
    listener = PgListener(psycopg_conninfo(database_url), broadcaster)
    listener.start()
    try:
        yield
    finally:
        listener.stop()
        broadcaster.attach(None)


async def sse_stream(snapshot: Callable[[], str | None]) -> AsyncIterator[str]:
    """Server-Sent Events: `event: snapshot` with the JSON from `snapshot()` whenever it
    changed, else a `: ping` comment. Wakes on a NOTIFY or every HEARTBEAT_SECONDS.

    `snapshot` is ordinary (blocking) database code, so it runs in a worker thread.
    It returns None when the user may no longer see the data: the stream then ends."""
    signal = broadcaster.subscribe()
    deadline = time.monotonic() + STREAM_MAX_SECONDS
    last: str | None = None
    try:
        # Tell the browser how long to wait before reconnecting after the stream ends.
        yield "retry: 3000\n\n"
        while True:
            data = await run_in_threadpool(snapshot)
            if data is None:
                break
            if data != last:
                yield f"event: snapshot\ndata: {data}\n\n"
                last = data
            else:
                yield ": ping\n\n"
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                break
            with contextlib.suppress(TimeoutError):
                await asyncio.wait_for(signal.wait(), timeout=min(HEARTBEAT_SECONDS, remaining))
            signal.clear()
    finally:
        broadcaster.unsubscribe(signal)
