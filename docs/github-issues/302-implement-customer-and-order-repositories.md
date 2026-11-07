<!-- issue-meta
title: [M3-02] Implement customer and order repositories
labels: backend, database
milestone: M3 – Order Management
-->
# [M3-02] Implement customer and order repositories

**Milestone:** M3 – Order Management · **Priority:** High · **Estimated effort:** 2–4 hours

## 1. Objective
Implement data-access functions for customers and orders, including eager loading of order items to avoid N+1 queries.

## 2. Background
Repositories keep SQL in one place so services contain only business rules (LLD §5).

## 3. Learning objectives
- SQLAlchemy `select()`, `selectinload`, `with_for_update()`
- The N+1 query problem
- LIMIT/OFFSET pagination and counting

## 4. Prerequisites
- M3-01 merged

## 5. Tasks
- [ ] `customer_repository`: `get_by_phone`, `create`
- [ ] `order_repository`: `add`, `get_with_items(id)`, `list_by_phone(phone)`, `list_admin(status, page, page_size)`, `count_by_status()`, `get_for_update(id)`
- [ ] `product_repository.get_many(ids)` returning a dict keyed by id

## 6. Technical guidance
Turn on `echo=True` temporarily to confirm loading an order with items uses 2 queries, not N+1.

## 7. Acceptance criteria
- [ ] Each function has a test against the test database
- [ ] Order detail loading uses eager loading

## 8. Testing requirements
- Repository tests using fixtures from M1-11

## 9. Expected deliverables
- Repository functions and tests

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Show the SQL generated for `get_with_items` and explain it
