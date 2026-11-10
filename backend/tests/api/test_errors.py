"""Tests for the standard error format and exception handlers (M1-08)."""

import json
import logging
from typing import Annotated

import pytest
from fastapi import FastAPI, Query
from fastapi.testclient import TestClient
from pydantic import BaseModel, Field

from app.core.errors import (
    INTERNAL_ERROR_MESSAGE,
    DomainError,
    DuplicateProductError,
    InvalidStatusTransitionError,
    NotFoundError,
    ProductUnavailableError,
    field_path,
    register_error_handlers,
)
from app.core.logging import REQUEST_ID_HEADER, JsonFormatter, RequestIdMiddleware
from app.main import app as main_app
from app.schemas.common import ErrorDetail

# ---- a small app with the real middleware and handlers, plus routes that fail ----


class Item(BaseModel):
    product_id: int = Field(gt=0)
    quantity: int = Field(ge=1, le=20)


class OrderBody(BaseModel):
    items: list[Item] = Field(min_length=1)


failing_app = FastAPI()
failing_app.add_middleware(RequestIdMiddleware)
register_error_handlers(failing_app)

DOMAIN_ERRORS: dict[str, DomainError] = {
    "not-found": NotFoundError("Product 99 was not found."),
    "unavailable": ProductUnavailableError(
        "Product 'Buffalo Milk 1 Litre' is currently unavailable.",
        details=[ErrorDetail(field="items[1].product_id", issue="unavailable")],
    ),
    "transition": InvalidStatusTransitionError(
        "Cannot change status from DELIVERED to PLACED."
    ),
    "duplicate": DuplicateProductError("The same product appears more than once."),
}


@failing_app.get("/domain/{name}")
def raise_domain_error(name: str) -> None:
    raise DOMAIN_ERRORS[name]


@failing_app.post("/orders")
def create_order(body: OrderBody) -> dict[str, int]:
    return {"items": len(body.items)}


@failing_app.get("/orders")
def list_orders(page: Annotated[int, Query(ge=1)] = 1) -> dict[str, int]:
    return {"page": page}


@failing_app.get("/crash")
def crash() -> None:
    raise RuntimeError("database password is hunter2")  # must never reach the client


client = TestClient(failing_app, raise_server_exceptions=False)


def assert_error_shape(response_json: dict, code: str) -> dict:
    assert set(response_json) == {"error"}
    error = response_json["error"]
    assert set(error) == {"code", "message", "details", "request_id"}
    assert error["code"] == code
    assert isinstance(error["message"], str) and error["message"]
    assert isinstance(error["details"], list)
    return error


# ---- domain errors ----


@pytest.mark.parametrize(
    ("name", "status", "code"),
    [
        ("not-found", 404, "NOT_FOUND"),
        ("unavailable", 409, "PRODUCT_UNAVAILABLE"),
        ("transition", 409, "INVALID_STATUS_TRANSITION"),
        ("duplicate", 400, "DUPLICATE_PRODUCT"),
    ],
)
def test_domain_errors_map_to_status_and_code(
    name: str, status: int, code: str
) -> None:
    response = client.get(f"/domain/{name}")

    assert response.status_code == status
    error = assert_error_shape(response.json(), code)
    assert error["message"] == DOMAIN_ERRORS[name].message
    assert error["request_id"] == response.headers[REQUEST_ID_HEADER]


def test_domain_error_details_are_returned() -> None:
    error = client.get("/domain/unavailable").json()["error"]

    assert error["details"] == [
        {"field": "items[1].product_id", "issue": "unavailable"}
    ]


# ---- 404 / 405 from routing ----


def test_unknown_url_returns_standard_404() -> None:
    response = TestClient(main_app).get(
        "/no-such-page", headers={REQUEST_ID_HEADER: "req-404"}
    )

    assert response.status_code == 404
    error = assert_error_shape(response.json(), "NOT_FOUND")
    assert error["request_id"] == "req-404"


def test_wrong_method_returns_standard_405_and_keeps_allow_header() -> None:
    response = TestClient(main_app).post("/api/v1/health")  # health is GET-only

    assert response.status_code == 405
    assert_error_shape(response.json(), "METHOD_NOT_ALLOWED")
    assert response.headers["allow"] == "GET"


# ---- 422 validation ----


def test_validation_errors_list_field_paths_like_items_0_quantity() -> None:
    response = client.post(
        "/orders",
        json={
            "items": [
                {"product_id": 2, "quantity": 0},
                {"product_id": -1, "quantity": 2},
            ]
        },
    )

    assert response.status_code == 422
    error = assert_error_shape(response.json(), "VALIDATION_ERROR")
    assert error["message"] == "Request validation failed."
    fields = {d["field"]: d["issue"] for d in error["details"]}
    assert set(fields) == {"items[0].quantity", "items[1].product_id"}
    assert "greater than or equal to 1" in fields["items[0].quantity"]


def test_missing_body_field_and_query_param_paths() -> None:
    missing = client.post("/orders", json={}).json()["error"]["details"]
    bad_page = client.get("/orders", params={"page": 0}).json()["error"]["details"]

    assert [d["field"] for d in missing] == ["items"]
    assert [d["field"] for d in bad_page] == ["page"]


def test_validation_errors_do_not_echo_submitted_values() -> None:
    response = client.post(
        "/orders", json={"items": [{"product_id": "9876543210x", "quantity": 1}]}
    )

    assert "9876543210x" not in response.text


def test_invalid_json_body_is_a_422() -> None:
    response = client.post(
        "/orders", content="{not json", headers={"content-type": "application/json"}
    )

    assert response.status_code == 422
    assert_error_shape(response.json(), "VALIDATION_ERROR")


@pytest.mark.parametrize(
    ("location", "expected"),
    [
        (("body", "items", 0, "quantity"), "items[0].quantity"),
        (("body", "customer", "phone"), "customer.phone"),
        (("query", "page"), "page"),
        (("path", "id"), "id"),
        (("body", 2), "[2]"),
        (("body",), "body"),
    ],
)
def test_field_path(location: tuple, expected: str) -> None:
    assert field_path(location) == expected


# ---- 500 unexpected errors ----


def test_unexpected_error_returns_500_without_stack_trace(
    caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.set_level(logging.INFO)
    response = client.get("/crash", headers={REQUEST_ID_HEADER: "req-500"})

    assert response.status_code == 500
    error = assert_error_shape(response.json(), "INTERNAL_ERROR")
    assert error["message"] == INTERNAL_ERROR_MESSAGE
    assert error["details"] == []
    assert error["request_id"] == "req-500" == response.headers[REQUEST_ID_HEADER]
    for leak in ("Traceback", "RuntimeError", "hunter2", ".py", "line "):
        assert leak not in response.text


def test_unexpected_error_is_logged_in_full_with_the_request_id(
    caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.set_level(logging.INFO)
    client.get("/crash", headers={REQUEST_ID_HEADER: "req-500-log"})

    record = next(r for r in caplog.records if r.name == "app.errors")
    line = json.loads(JsonFormatter().format(record))
    assert line["severity"] == "ERROR"
    assert line["request_id"] == "req-500-log"
    assert line["path"] == "/crash"
    assert "RuntimeError" in line["exception"] and "Traceback" in line["exception"]
    # The request log line also records the 500.
    request_line = next(r for r in caplog.records if r.name == "app.request")
    assert request_line.status_code == 500
