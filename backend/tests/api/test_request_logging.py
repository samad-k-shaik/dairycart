"""Tests for structured logging and the request ID middleware (M1-03)."""

import json
import logging
import uuid

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.logging import (
    REQUEST_ID_HEADER,
    JsonFormatter,
    RequestIdMiddleware,
    request_id_var,
)
from app.main import app

client = TestClient(app)
REQUEST_FIELDS = {"request_id", "method", "path", "status_code", "duration_ms"}


def request_log_records(caplog: pytest.LogCaptureFixture) -> list[logging.LogRecord]:
    return [r for r in caplog.records if r.name == "app.request"]


# ---- X-Request-ID header ----


def test_every_response_has_a_generated_request_id() -> None:
    response = client.get("/")

    request_id = response.headers[REQUEST_ID_HEADER]
    assert uuid.UUID(request_id).version == 4


def test_each_request_gets_a_different_id() -> None:
    first = client.get("/").headers[REQUEST_ID_HEADER]
    second = client.get("/").headers[REQUEST_ID_HEADER]

    assert first != second


def test_supplied_request_id_is_echoed_back() -> None:
    response = client.get("/", headers={REQUEST_ID_HEADER: "abc-123.trace_9"})

    assert response.headers[REQUEST_ID_HEADER] == "abc-123.trace_9"


@pytest.mark.parametrize(
    "unsafe",
    ["has spaces", 'quote"injection', "x" * 129, "line\tbreak"],
)
def test_unsafe_supplied_request_id_is_replaced(unsafe: str) -> None:
    response = client.get("/", headers={REQUEST_ID_HEADER: unsafe})

    assert response.headers[REQUEST_ID_HEADER] != unsafe
    assert uuid.UUID(response.headers[REQUEST_ID_HEADER]).version == 4


def test_not_found_responses_also_get_a_request_id() -> None:
    response = client.get("/no-such-route")

    assert response.status_code == 404
    assert REQUEST_ID_HEADER in response.headers


# ---- one log line per request ----


def test_one_log_record_per_request_with_the_five_fields(
    caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.set_level(logging.INFO)
    response = client.get("/", headers={REQUEST_ID_HEADER: "req-42"})

    records = request_log_records(caplog)
    assert len(records) == 1
    line = json.loads(JsonFormatter().format(records[0]))
    assert REQUEST_FIELDS <= line.keys()
    assert line["request_id"] == "req-42" == response.headers[REQUEST_ID_HEADER]
    assert (line["method"], line["path"], line["status_code"]) == ("GET", "/", 200)
    assert isinstance(line["duration_ms"], float) and line["duration_ms"] >= 0
    assert line["severity"] == "INFO" and line["message"] == "request completed"


def test_query_string_and_body_are_not_logged(caplog: pytest.LogCaptureFixture) -> None:
    caplog.set_level(logging.INFO)
    client.post("/?phone=9876543210", json={"customer": {"phone": "9123456780"}})

    line = JsonFormatter().format(request_log_records(caplog)[0])
    assert "9876543210" not in line and "9123456780" not in line
    assert json.loads(line)["path"] == "/"


def test_log_level_setting_filters_request_lines(
    caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.set_level(logging.WARNING)  # like LOG_LEVEL=WARNING
    client.get("/")

    assert request_log_records(caplog) == []


def test_crashing_endpoint_still_logs_status_500(
    caplog: pytest.LogCaptureFixture,
) -> None:
    broken = FastAPI()
    broken.add_middleware(RequestIdMiddleware)

    @broken.get("/boom")
    def boom() -> None:
        raise RuntimeError("bug")

    caplog.set_level(logging.INFO)
    TestClient(broken, raise_server_exceptions=False).get("/boom")

    line = json.loads(JsonFormatter().format(request_log_records(caplog)[0]))
    assert line["status_code"] == 500 and line["path"] == "/boom"


# ---- the JSON formatter ----


def make_record(message: str = "hello", **extra: object) -> logging.LogRecord:
    record = logging.LogRecord(
        "app.test", logging.WARNING, __file__, 1, message, None, None
    )
    for key, value in extra.items():
        setattr(record, key, value)
    return record


def test_formatter_writes_one_line_of_valid_json() -> None:
    text = JsonFormatter().format(make_record("multi\nline message"))

    assert "\n" not in text
    data = json.loads(text)
    assert data["severity"] == "WARNING"
    assert data["logger"] == "app.test"
    assert data["message"] == "multi\nline message"
    assert data["timestamp"].endswith("+00:00")  # UTC


def test_other_log_lines_during_a_request_carry_the_request_id() -> None:
    token = request_id_var.set("ctx-7")
    try:
        data = json.loads(JsonFormatter().format(make_record("doing work")))
    finally:
        request_id_var.reset(token)

    assert data["request_id"] == "ctx-7"


def test_formatter_includes_exception_details() -> None:
    try:
        raise ValueError("bad thing")
    except ValueError:
        import sys

        record = make_record("failed")
        record.exc_info = sys.exc_info()

    data = json.loads(JsonFormatter().format(record))
    assert "ValueError: bad thing" in data["exception"]
