<!-- issue-meta
title: [M1-08] Implement the standard error response format and exception handlers
labels: backend
milestone: M1 – Backend Foundation
-->
# [M1-08] Implement the standard error response format and exception handlers

**Milestone:** M1 – Backend Foundation · **Priority:** High · **Estimated effort:** 2–4 hours

## 1. Objective
Make every error response use the single JSON format defined in `docs/05-api/api-contracts.md#error-format`.

## 2. Background
A consistent error shape lets the frontend show useful messages with one piece of code, and the `request_id` links a user's error to our logs.

## 3. Learning objectives
- Custom exception classes
- FastAPI exception handlers (`@app.exception_handler`)
- Converting Pydantic `RequestValidationError` into friendly field errors
- Why we never return stack traces to clients

## 4. Prerequisites
- M1-03 merged

## 5. Tasks
- [ ] Create `app/core/errors.py` with `DomainError` base and `NotFoundError`, `ProductUnavailableError`, `InvalidStatusTransitionError`, `DuplicateProductError`
- [ ] Create `app/schemas/common.py` with `ErrorResponse`
- [ ] Register handlers for domain errors, `RequestValidationError` (422) and unhandled `Exception` (500)
- [ ] Include `request_id` from the middleware

## 6. Technical guidance
Follow the exception → status/code table in LLD §8. For 500 errors log the exception with `logger.exception` and return a generic message.

## 7. Acceptance criteria
- [ ] Every handled error returns `{"error": {"code", "message", "details", "request_id"}}`
- [ ] Validation errors list field paths like `items[0].quantity`
- [ ] 500 responses contain no stack trace

## 8. Testing requirements
- API tests for 404, 422 and a forced 500 response shape

## 9. Expected deliverables
- `app/core/errors.py`, `app/schemas/common.py`, handlers, tests

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Why is a 409 different from a 422?
- What would an attacker learn from a stack trace?
