"""Live updates (#113): Server-Sent Events + PostgreSQL LISTEN/NOTIFY."""

import asyncio
from datetime import UTC, datetime, timedelta

import psycopg
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core import live_updates
from app.core.live_updates import Broadcaster, PgListener, psycopg_conninfo, sse_stream
from app.models import DeliveryArea, DeliveryBoy, OrderStatus, User, UserRole
from app.schemas.delivery import LocationUpdate
from app.services import tracking_service
from tests import factories
from tests.conftest import TEST_DATABASE_URL


async def collect(stream) -> list[str]:
    return [chunk async for chunk in stream]


@pytest.fixture
def short_streams(monkeypatch: pytest.MonkeyPatch) -> None:
    """Streams end after their first snapshot, so tests can read the whole response."""
    monkeypatch.setattr(live_updates, "STREAM_MAX_SECONDS", 0.0)


# ---- the stream format ----


def test_stream_sends_a_snapshot_then_pings_until_something_changes(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(live_updates, "HEARTBEAT_SECONDS", 0.01)
    monkeypatch.setattr(live_updates, "STREAM_MAX_SECONDS", 0.2)
    values = iter(['{"n":1}', '{"n":1}', '{"n":2}'])

    chunks = asyncio.run(collect(sse_stream(lambda: next(values, '{"n":2}'))))

    assert chunks[0] == "retry: 3000\n\n"
    assert chunks[1] == 'event: snapshot\ndata: {"n":1}\n\n'
    assert chunks[2] == ": ping\n\n"  # unchanged → only a keep-alive comment
    assert 'event: snapshot\ndata: {"n":2}\n\n' in chunks  # changed → a new snapshot


def test_stream_ends_when_access_is_lost() -> None:
    chunks = asyncio.run(collect(sse_stream(lambda: None)))
    assert chunks == ["retry: 3000\n\n"]


def test_a_notification_wakes_the_stream_at_once(monkeypatch: pytest.MonkeyPatch) -> None:
    """With a long heartbeat, only the broadcast can explain a quick second snapshot."""
    monkeypatch.setattr(live_updates, "HEARTBEAT_SECONDS", 30.0)
    monkeypatch.setattr(live_updates, "STREAM_MAX_SECONDS", 0.5)
    values = iter(['{"n":1}', '{"n":2}'])

    async def scenario() -> list[str]:
        live_updates.broadcaster.attach(asyncio.get_running_loop())
        stream = sse_stream(lambda: next(values, '{"n":2}'))
        chunks = [await anext(stream), await anext(stream)]  # retry + first snapshot
        live_updates.broadcaster.publish_threadsafe()
        chunks.append(await asyncio.wait_for(anext(stream), timeout=2))
        await stream.aclose()
        live_updates.broadcaster.attach(None)
        return chunks

    assert asyncio.run(scenario())[2] == 'event: snapshot\ndata: {"n":2}\n\n'


# ---- PostgreSQL LISTEN/NOTIFY, for real ----


def test_listener_hears_a_notify_from_another_connection(migrated_db) -> None:
    conninfo = psycopg_conninfo(TEST_DATABASE_URL)

    async def scenario() -> bool:
        target = Broadcaster()
        target.attach(asyncio.get_running_loop())
        woken = target.subscribe()
        listener = PgListener(conninfo, target)
        listener.start()
        try:
            ready = await asyncio.to_thread(listener.ready.wait, 10)
            assert ready, "listener did not connect"
            # Another "instance" commits a change (autocommit = commit at once).
            with psycopg.connect(conninfo, autocommit=True) as other:
                other.execute(f"NOTIFY {live_updates.CHANNEL}")
            await asyncio.wait_for(woken.wait(), timeout=5)
            return True
        finally:
            listener.stop()

    assert asyncio.run(scenario()) is True


def test_conninfo_drops_the_sqlalchemy_driver_name() -> None:
    assert psycopg_conninfo("postgresql+psycopg://u:p@h:5432/db") == "postgresql://u:p@h:5432/db"


def test_notify_only_when_the_pin_really_moved(
    db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    calls: list[int] = []
    monkeypatch.setattr(tracking_service, "notify_change", lambda db: calls.append(1))
    boy = DeliveryBoy(name="Ravi", phone="9876500001", round_started_at=datetime.now(UTC))
    db_session.add(boy)
    db_session.flush()
    now = datetime.now(UTC)

    def send(seconds_ago: int) -> None:
        data = LocationUpdate(
            latitude=17.43, longitude=78.44, recorded_at=now - timedelta(seconds=seconds_ago)
        )
        tracking_service.save_location(db_session, boy, data)

    send(10)  # first reading → notify
    send(30)  # older than the saved one → ignored → no notify
    send(0)  # newer → notify
    assert len(calls) == 2


# ---- the stream endpoints ----


def test_admin_stream_sends_the_live_map(
    client: TestClient, db_session: Session, admin_user: User, short_streams
) -> None:
    boy = DeliveryBoy(name="Ravi", phone="9876500001")
    boy.areas.append(DeliveryArea(pincode="500016"))
    db_session.add(boy)
    db_session.flush()

    response = client.get(
        "/api/v1/admin/delivery-boys/locations/stream", headers=factories.auth_header(admin_user)
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert response.headers["cache-control"] == "no-cache"
    assert "event: snapshot\ndata: [" in response.text
    assert '"name":"Ravi"' in response.text


def test_admin_stream_is_for_admins_only(client: TestClient, db_session: Session) -> None:
    url = "/api/v1/admin/delivery-boys/locations/stream"
    assert client.get(url).status_code == 401
    customer = factories.auth_header(factories.make_user(db_session))
    assert client.get(url, headers=customer).status_code == 403


def test_order_stream_follows_the_order_rules(
    client: TestClient, db_session: Session, short_streams
) -> None:
    owner = factories.make_user(db_session)
    order = factories.make_order(db_session, status=OrderStatus.CONFIRMED, user=owner)
    url = f"/api/v1/orders/{order.order_id}/tracking/stream"

    mine = client.get(url, headers=factories.auth_header(owner))
    stranger = client.get(url, headers=factories.auth_header(factories.make_user(db_session)))
    boy_account = factories.make_user(db_session, role=UserRole.DELIVERY_BOY)

    assert mine.status_code == 200
    assert f'"order_id":{order.order_id}' in mine.text
    assert '"status":"CONFIRMED"' in mine.text
    assert stranger.status_code == 404  # checked BEFORE streaming
    assert client.get(url, headers=factories.auth_header(boy_account)).status_code == 404
