"""CORS tests (M3-08): only the configured frontend origin may call the API."""

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.config import Settings

FRONTEND = "http://localhost:5173"


def test_frontend_origin_is_allowed(client: TestClient) -> None:
    response = client.get("/api/v1/health", headers={"Origin": FRONTEND})

    assert response.headers["access-control-allow-origin"] == FRONTEND


def test_preflight_for_a_post_from_the_frontend(client: TestClient) -> None:
    response = client.options(
        "/api/v1/orders",
        headers={
            "Origin": FRONTEND,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == FRONTEND
    assert "POST" in response.headers["access-control-allow-methods"]


def test_other_origins_are_blocked(client: TestClient) -> None:
    simple = client.get("/api/v1/health", headers={"Origin": "https://evil.example"})
    preflight = client.options(
        "/api/v1/orders",
        headers={
            "Origin": "https://evil.example",
            "Access-Control-Request-Method": "POST",
        },
    )

    # No allow-origin header → the browser refuses to give the page the response.
    assert "access-control-allow-origin" not in simple.headers
    assert preflight.status_code == 400


def test_error_responses_also_carry_cors_headers(client: TestClient) -> None:
    response = client.get("/api/v1/products/424242", headers={"Origin": FRONTEND})

    assert response.status_code == 404
    assert response.headers["access-control-allow-origin"] == FRONTEND


def test_wildcard_origin_is_refused_in_settings() -> None:
    with pytest.raises(ValidationError, match="not allowed"):
        Settings(
            database_url="postgresql+psycopg://u:p@localhost/db_test",
            cors_origins="*",
            _env_file=None,
        )
