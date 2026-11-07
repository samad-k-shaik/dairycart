<!-- issue-meta
title: [M1-05] Create SQLAlchemy models for customers, products, orders and order items
labels: backend, database
milestone: M1 – Backend Foundation
-->
# [M1-05] Create SQLAlchemy models for customers, products, orders and order items

**Milestone:** M1 – Backend Foundation · **Priority:** High · **Estimated effort:** 3–5 hours

## 1. Objective
Implement ORM models that exactly match `docs/04-architecture/database-erd.md`, including keys, constraints and relationships.

## 2. Background
Models are the Python view of our tables. They must match the approved ERD so that migrations, repositories and API schemas stay consistent.

## 3. Learning objectives
- SQLAlchemy 2.0 typed mappings (`Mapped[...]`, `mapped_column`)
- Primary keys, foreign keys, `UniqueConstraint`, `CheckConstraint`
- `relationship()` and `back_populates`
- Why money uses `Numeric(10, 2)` and Python `Decimal`

## 4. Prerequisites
- M1-04 merged
- Read the ERD and `database/init.sql`

## 5. Tasks
- [ ] Create `app/models/customer.py`, `product.py`, `order.py`, `order_item.py`
- [ ] Create an `OrderStatus` string enum (`PLACED`, `CONFIRMED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`)
- [ ] Add all constraints from the ERD (CHECKs, UNIQUEs, `ondelete` rules)
- [ ] Add relationships `Customer.orders`, `Order.items`, `OrderItem.product`
- [ ] Import all models in `app/models/__init__.py` so Alembic can discover them

## 6. Technical guidance
Name constraints explicitly (e.g. `ck_order_items_quantity_range`) so migrations are readable. Store `status` as `String(20)` with a CHECK constraint rather than a native PostgreSQL enum; it is easier to change later.

## 7. Acceptance criteria
- [ ] Four models exist with every column, type and constraint from the ERD
- [ ] Relationships navigate in both directions
- [ ] Money columns use `Numeric(10, 2)` and map to `Decimal`
- [ ] Any difference from the ERD is fixed in the ERD in the same PR

## 8. Testing requirements
- Covered by the migration test in M1-06 (generated DDL matches `init.sql`)
- Unit test: creating an `Order` with two `OrderItem`s links them correctly

## 9. Expected deliverables
- Model files, `OrderStatus` enum, tests

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Why `ON DELETE RESTRICT` for products but `CASCADE` for order items?
- Why not use `float` for prices?
