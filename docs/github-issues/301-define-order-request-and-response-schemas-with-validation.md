<!-- issue-meta
title: [M3-01] Define order request and response schemas with validation
labels: backend
milestone: M3 – Order Management
-->
# [M3-01] Define order request and response schemas with validation

**Milestone:** M3 – Order Management · **Priority:** High · **Estimated effort:** 2–3 hours

## 1. Objective
Create Pydantic schemas for creating, reading and listing orders and for status updates, with all validation rules from the API contract.

## 2. Background
Validation at the edge stops bad data before it reaches business logic. Rejecting unknown fields stops clients from sending prices or totals.

## 3. Learning objectives
- Pydantic `Field` constraints, `pattern`, `conlist`/length limits
- `model_config = ConfigDict(extra="forbid")`
- Separate input and output schemas

## 4. Prerequisites
- M1 complete

## 5. Tasks
- [ ] `CustomerIn` (name 2–100, trimmed; phone `^[6-9]\d{9}$`)
- [ ] `OrderItemIn` (product_id > 0, quantity 1–20); `OrderCreate` (1–10 items, extra fields forbidden)
- [ ] `OrderRead`, `OrderItemRead`, `OrderSummary`, `AdminOrderPage`, `StatusUpdate`
- [ ] Serialise money as 2-decimal strings

## 6. Technical guidance
Copy field names exactly from `api-contracts.md`. Duplicate product ids are rejected in the service (M3-03), not the schema, so the error code can be `DUPLICATE_PRODUCT`.

## 7. Acceptance criteria
- [ ] Every rule in the contract's validation table is enforced
- [ ] Sending `total_amount` or `price` returns 422

## 8. Testing requirements
- Unit tests for each validation rule (valid and invalid cases)

## 9. Expected deliverables
- `app/schemas/order.py`, tests

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Why forbid extra fields on `OrderCreate`?
