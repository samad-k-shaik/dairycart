"""Smoke tests for the scaffold (M1-01).

TestClient (built on httpx) calls the app in-process, without starting a server.
The full pytest setup with a test database comes in M1-11.
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root_returns_api_name() -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {"name": "Milk Delivery POC API"}


def test_openapi_docs_describe_the_app() -> None:
    # /docs (Swagger UI) is built from this OpenAPI document.
    response = client.get("/openapi.json")

    assert response.status_code == 200
    info = response.json()["info"]
    assert info["title"] == "Milk Delivery POC API"
    assert info["version"] == "0.1.0"
