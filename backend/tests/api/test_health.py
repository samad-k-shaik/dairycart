"""Tests for GET /api/v1/health (M1-09)."""

import logging
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.database.session import get_db
from app.main import app


def test_health_is_200_when_the_database_is_up(client: TestClient) -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok", "version": "0.1.0"}
    assert response.headers["cache-control"] == "no-store"


class BrokenSession:
    """Stands in for a Session whose database cannot be reached."""

    def execute(self, *args: object, **kwargs: object) -> None:
        raise OperationalError("SELECT 1", {}, Exception("connection refused"))


@pytest.fixture
def broken_db_client() -> Iterator[TestClient]:
    def broken_get_db() -> Iterator[BrokenSession]:
        yield BrokenSession()

    app.dependency_overrides[get_db] = broken_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_health_is_503_when_the_database_fails(
    broken_db_client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    caplog.set_level(logging.INFO)
    response = broken_db_client.get("/api/v1/health")

    assert response.status_code == 503
    assert response.json() == {
        "status": "degraded",
        "database": "unavailable",
        "version": "0.1.0",
    }
    warning = next(r for r in caplog.records if r.name == "app.health")
    assert warning.levelname == "WARNING"
    assert "OperationalError" in warning.getMessage()
    # Only the error type is logged, no connection details.
    assert "connection refused" not in warning.getMessage()


def test_health_appears_in_the_docs() -> None:
    operation = (
        TestClient(app).get("/openapi.json").json()["paths"]["/api/v1/health"]["get"]
    )

    assert operation["tags"] == ["health"]
    assert {"200", "503"} <= set(operation["responses"])
