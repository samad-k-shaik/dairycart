<!-- issue-meta
title: [M0] Prepare REST API contract documentation (v1)
labels: documentation, backend, architecture
milestone: M0 – Project Foundation
-->
# [M0] Prepare REST API contract documentation (v1)

> **Initial draft status:** A draft exists in `docs/05-api/api-contracts.md`. This issue covers **reviewing and approving** the contract before backend (M1/M3) and frontend (M2/M3) work depend on it.

## 1. Objective
Agree a precise contract for the initial REST endpoints, including request/response JSON, validation, status codes and a single error format.

## 2. Background
Frontend and backend developers work in parallel. A written contract lets the frontend build against mock JSON in M2 that matches what the backend will return in M3. The most important rule: **the backend calculates order totals from database prices** and never trusts client-supplied prices or totals.

## 3. Learning objectives
- Understand REST resources, HTTP methods and status codes (200, 201, 400, 404, 409, 422, 500, 503).
- Understand API versioning (`/api/v1`).
- Understand request validation and consistent error responses.
- Understand why money is sent as decimal strings.
- Understand why clients must not send prices.

## 4. Prerequisites
- Issue #3 (architecture) and Issue #4 (ERD) reviewed.

## 5. Tasks
- [ ] Review each endpoint: `GET /health`, `GET /products`, `GET /products/{id}`, `POST /orders`, `GET /orders/{id}`, `GET /admin/orders`, `PATCH /admin/orders/{id}/status`.
- [ ] Check every endpoint has sample request/response JSON, validation rules and error cases.
- [ ] Decide on proposed additions `GET /orders?phone=` (ADR-005) and `include_unavailable` (ADR-006).
- [ ] Check the error format is used consistently.
- [ ] Check response field names match the ERD.
- [ ] Update the doc and ADR table via PR.

## 6. Technical guidance
- FastAPI generates OpenAPI at `/docs`. In M1/M3 the generated spec must match this document; if they differ, the document is updated in the same PR.
- 422 = request shape is wrong (Pydantic); 409 = valid request that conflicts with current state.

## 7. Acceptance criteria
- [ ] All 7 initial endpoints documented with method, path, purpose, request, response and status codes.
- [ ] `POST /orders` documents that only `product_id` and `quantity` are accepted and totals are server-calculated.
- [ ] One error response format documented with examples.
- [ ] Proposed endpoints accepted or rejected.
- [ ] Backend and frontend representatives both approve.

## 8. Testing requirements
- Validate every JSON sample is syntactically valid (paste into a JSON validator or `python -m json.tool`).
- Check that `POST /orders` example totals are arithmetically correct (2 × 60 + 1 × 35 = 155).

## 9. Expected deliverables
- Approved `docs/05-api/api-contracts.md`.
- PR referencing this issue.

## 10. Definition of Done
- [ ] Acceptance criteria met
- [ ] PR reviewed by one backend and one frontend participant and merged
- [ ] Card moved to **Done**

### Review questions
- What status code should ordering an unavailable product return, and why not 422?
- Why does `POST /orders` return `201` and a `Location` header?
