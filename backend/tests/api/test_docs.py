"""The interactive API docs (/docs) and the OpenAPI document they are built from."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_openapi_docs_describe_the_app() -> None:
    response = client.get("/openapi.json")

    assert response.status_code == 200
    info = response.json()["info"]
    assert info["title"] == "Milk Delivery POC API"
    assert info["version"] == "0.1.0"


def test_swagger_ui_is_served() -> None:
    response = client.get("/docs")

    assert response.status_code == 200
    assert "swagger-ui" in response.text


def test_all_endpoints_are_under_api_v1() -> None:
    paths = client.get("/openapi.json").json()["paths"]

    assert paths  # at least one endpoint
    assert all(path.startswith("/api/v1/") for path in paths), sorted(paths)


def test_temporary_root_route_was_removed() -> None:
    # GET / from M1-01 was removed in M1-09; it now gets the standard 404.
    assert client.get("/").status_code == 404
