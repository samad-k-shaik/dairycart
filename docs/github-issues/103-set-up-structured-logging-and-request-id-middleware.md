<!-- issue-meta
title: [M1-03] Set up structured logging and request ID middleware
labels: backend
milestone: M1 – Backend Foundation
-->
# [M1-03] Set up structured logging and request ID middleware

**Milestone:** M1 – Backend Foundation · **Priority:** Medium · **Estimated effort:** 2–4 hours

## 1. Objective
Emit one JSON log line per request with request ID, method, path, status code and duration, and return the request ID in an `X-Request-ID` header.

## 2. Background
In production (M6) we read logs in Cloud Logging. Structured JSON logs with a request ID let us trace one failing request across log lines and match it to the `request_id` in error responses.

## 3. Learning objectives
- Python `logging` module, handlers and formatters
- FastAPI/Starlette middleware
- Correlation IDs and why they help debugging

## 4. Prerequisites
- M1-02 merged

## 5. Tasks
- [ ] Create `app/core/logging.py` configuring a JSON formatter at `LOG_LEVEL`
- [ ] Add middleware that reads `X-Request-ID` or generates a UUID4, stores it on `request.state`, and adds it to the response header
- [ ] Log `method`, `path`, `status_code`, `duration_ms`, `request_id` after each request
- [ ] Register middleware in `main.py`

## 6. Technical guidance
Keep it dependency-free (a small `logging.Formatter` subclass using `json.dumps`) unless the team writes an ADR for a logging library. Do not log request bodies; they may contain phone numbers.

## 7. Acceptance criteria
- [ ] Every response has an `X-Request-ID` header
- [ ] Each request produces one JSON log line with the five fields
- [ ] An incoming `X-Request-ID` is reused, not replaced

## 8. Testing requirements
- API test: response contains `X-Request-ID`
- API test: supplied request ID is echoed back
- Manually inspect the log output and paste one line in the PR

## 9. Expected deliverables
- `app/core/logging.py`, middleware, tests

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Why shouldn't we log request bodies?
- How will a request ID help when a customer reports an error?
