<!-- issue-meta
title: [M3-04] Implement POST /api/v1/orders
labels: backend
milestone: M3 – Order Management
-->
# [M3-04] Implement POST /api/v1/orders

**Milestone:** M3 – Order Management · **Priority:** High · **Estimated effort:** 2 hours

## 1. Objective
Expose order creation over HTTP, returning 201 with a `Location` header and the full order.

## 2. Background
Connects the service from M3-03 to the API contract.

## 3. Learning objectives
- Status codes 201 vs 200
- `Response` headers in FastAPI

## 4. Prerequisites
- M3-03 merged

## 5. Tasks
- [ ] Create `app/routers/orders.py` with `POST /orders`
- [ ] Return 201 + `Location: /api/v1/orders/{id}`
- [ ] Map domain errors via the existing handlers

## 6. Technical guidance
Keep the router thin; it only calls the service.

## 7. Acceptance criteria
- [ ] Responses and errors match the contract examples

## 8. Testing requirements
- API tests for 201, 400, 404, 409, 422

## 9. Expected deliverables
- Router and tests

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- What does the `Location` header tell the client?
