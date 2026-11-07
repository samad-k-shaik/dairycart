<!-- issue-meta
title: [M3-05] Implement order details and customer order history endpoints
labels: backend
milestone: M3 – Order Management
-->
# [M3-05] Implement order details and customer order history endpoints

**Milestone:** M3 – Order Management · **Priority:** High · **Estimated effort:** 2–4 hours

## 1. Objective
Implement `GET /api/v1/orders/{id}` and `GET /api/v1/orders?phone=` (ADR-005).

## 2. Background
Supports the confirmation page, order history and admin details.

## 3. Learning objectives
- Query parameter validation
- Returning summaries vs full objects

## 4. Prerequisites
- M3-04 merged

## 5. Tasks
- [ ] `GET /orders/{id}` returns full order or 404
- [ ] `GET /orders?phone=` returns summaries newest first; unknown phone → `[]`; invalid phone → 422

## 6. Technical guidance
POC note: anyone who knows a phone number can see that customer's orders. This is the accepted risk from ADR-003; mention it in the PR.

## 7. Acceptance criteria
- [ ] Both endpoints match the contract

## 8. Testing requirements
- API tests for found, not found, empty history, invalid phone, ordering

## 9. Expected deliverables
- Router functions and tests

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- What security risk does phone-based lookup have, and how would auth fix it?
