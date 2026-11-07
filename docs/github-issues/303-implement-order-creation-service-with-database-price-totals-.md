<!-- issue-meta
title: [M3-03] Implement order creation service with database-price totals in one transaction
labels: backend, database
milestone: M3 – Order Management
-->
# [M3-03] Implement order creation service with database-price totals in one transaction

**Milestone:** M3 – Order Management · **Priority:** High · **Estimated effort:** 4–6 hours

## 1. Objective
Implement `OrderService.create_order` that validates products, calculates every price and total from the database, finds or creates the customer and saves everything atomically.

## 2. Background
This is the most important business rule in the POC (BR-1 to BR-6). The backend must never trust client prices, and a failed item must leave nothing saved.

## 3. Learning objectives
- Database transactions (`with db.begin()`), commit and rollback
- Snapshotting prices (`unit_price`)
- Decimal arithmetic in Python

## 4. Prerequisites
- M3-02 merged
- Read LLD §6 pseudocode

## 5. Tasks
- [ ] Reject duplicate product ids → `DuplicateProductError`
- [ ] Load all products in one query; missing → `NotFoundError`; unavailable → `ProductUnavailableError`
- [ ] Get or create the customer by phone (BR-5)
- [ ] Compute `unit_price`, `subtotal`, `total_amount` with `Decimal`
- [ ] Persist order and items in one transaction with status `PLACED`

## 6. Technical guidance
If any step raises, nothing must be written. Do not accept or read any price from the request.

## 7. Acceptance criteria
- [ ] Total always equals Σ(database price × quantity)
- [ ] Any error leaves the database unchanged
- [ ] Existing phone reuses the customer; new phone creates one

## 8. Testing requirements
- Unit/integration tests: happy path total (2×60 + 1×35 = 155.00), unknown product, unavailable product, duplicate product, rollback on forced failure, price change does not alter old orders

## 9. Expected deliverables
- `app/services/order_service.py`, tests

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Prove with a test that a failed order leaves no rows behind
