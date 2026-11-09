"""Tests for the engine, session factory and get_db() dependency (M1-04)."""

from typing import Annotated

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text
from sqlalchemy.orm import Session

from app.database.base import Base
from app.database.session import database_url, engine, get_db


def test_get_db_yields_a_session_that_can_run_select_1(db_engine: Engine) -> None:
    generator = get_db()
    session = next(generator)

    assert isinstance(session, Session)
    assert session.execute(text("SELECT 1")).scalar_one() == 1

    generator.close()


def test_session_is_closed_after_the_generator_finishes(db_engine: Engine) -> None:
    generator = get_db()
    session = next(generator)
    session.execute(text("SELECT 1"))
    assert session.in_transaction()  # a connection is checked out

    with pytest.raises(StopIteration):
        next(generator)  # what FastAPI does after the response is sent

    assert not session.in_transaction()  # closed: connection returned to the pool


def test_session_is_closed_even_when_the_request_fails(db_engine: Engine) -> None:
    sessions: list[Session] = []
    app = FastAPI()

    @app.get("/fails")
    def fails(db: Annotated[Session, Depends(get_db)]) -> None:
        sessions.append(db)
        db.execute(text("SELECT 1"))
        raise RuntimeError("bug in the endpoint")

    response = TestClient(app, raise_server_exceptions=False).get("/fails")

    assert response.status_code == 500
    assert not sessions[0].in_transaction()


def test_each_request_gets_its_own_session(db_engine: Engine) -> None:
    seen: list[int] = []
    app = FastAPI()

    @app.get("/id")
    def session_id(db: Annotated[Session, Depends(get_db)]) -> None:
        seen.append(id(db))

    client = TestClient(app)
    client.get("/id")
    client.get("/id")

    assert seen[0] != seen[1]


def test_connects_to_postgresql_with_the_configured_url(db_engine: Engine) -> None:
    with engine.connect() as connection:
        version = connection.execute(text("SHOW server_version")).scalar_one()
        database = connection.execute(text("SELECT current_database()")).scalar_one()

    assert version.startswith("16")
    assert database == "milk_delivery_test"


def test_uses_the_psycopg3_driver_and_hides_query_values() -> None:
    assert engine.dialect.driver == "psycopg"
    assert engine.hide_parameters is True
    assert engine.pool._pre_ping is True


def test_plain_postgresql_url_is_switched_to_psycopg(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.core.config import get_settings

    monkeypatch.setenv("DATABASE_URL", "postgresql://u:p@localhost:5432/db")
    get_settings.cache_clear()
    try:
        assert database_url().drivername == "postgresql+psycopg"
    finally:
        get_settings.cache_clear()


def test_password_is_hidden_when_the_url_is_printed() -> None:
    assert "milk_password_local_only" not in str(engine.url)
    assert "milk_password_local_only" not in repr(engine)


def test_application_code_never_creates_tables() -> None:
    from pathlib import Path

    app_dir = Path(__file__).resolve().parents[1] / "app"
    offenders = [
        path.name
        for path in app_dir.rglob("*.py")
        if "create_all(" in path.read_text(encoding="utf-8")
    ]
    assert offenders == [], f"create_all found in {offenders}; use Alembic (M1-06)"
    assert Base.metadata is not None
