<!-- issue-meta
title: [M0] Prepare initial database ERD and reference schema
labels: documentation, database, architecture
milestone: M0 – Project Foundation
-->
# [M0] Prepare initial database ERD and reference schema

> **Initial draft status:** Drafts exist in `docs/04-architecture/database-erd.md`, `database/init.sql` and `database/seed.sql`. This issue covers **reviewing, validating and approving** them.

## 1. Objective
Define the relational data model for customers, products, orders and order items, with primary keys, foreign keys, constraints, relationships and normalization notes.

## 2. Background
The ERD is the blueprint for the SQLAlchemy models and Alembic migrations in M1. Mistakes here are expensive later. A key design point: **`order_items.unit_price` stores a price snapshot**, so old orders keep the price the customer actually paid.

## 3. Learning objectives
- Read a Mermaid ER diagram and crow's-foot cardinality.
- Understand primary keys, foreign keys, unique and check constraints.
- Understand 1NF, 2NF, 3NF and when deliberate denormalization is correct.
- Understand junction tables for many-to-many relationships.
- Understand `ON DELETE RESTRICT` vs `CASCADE`.
- Understand why money uses `NUMERIC`, not `FLOAT`.

## 4. Prerequisites
- Issue #2 (requirements) reviewed.
- Docker installed (for the optional validation step).

## 5. Tasks
- [ ] Review the ERD diagram and table definitions for CUSTOMERS, PRODUCTS, ORDERS, ORDER_ITEMS.
- [ ] Confirm the required columns from the master plan are all present.
- [ ] Review the extra audit columns (`created_at`) and constraints; accept or reject.
- [ ] Review normalization notes and the reasons for storing `unit_price`, `subtotal`, `total_amount`.
- [ ] Validate `database/init.sql` and `seed.sql` against a local PostgreSQL (see Technical guidance).
- [ ] Confirm seed data has the 4 products with correct prices.

## 6. Technical guidance
```bash
docker compose up -d db
docker compose exec -T db psql -U milk_user -d milk_delivery < database/init.sql
docker compose exec -T db psql -U milk_user -d milk_delivery < database/seed.sql
docker compose exec db psql -U milk_user -d milk_delivery -c "SELECT * FROM products;"
# clean up afterwards so M1 migrations start from an empty DB:
docker compose down -v
```
- From M1, Alembic is the source of truth; `init.sql` is a reference that must be kept in sync.

## 7. Acceptance criteria
- [ ] ERD includes all four tables, PKs, FKs and relationships with cardinality.
- [ ] Constraints documented: NOT NULL, UNIQUE, CHECK (price > 0, quantity 1–20, status values).
- [ ] Normalization and denormalization decisions explained.
- [ ] `init.sql` runs without errors on PostgreSQL 16; `seed.sql` inserts the 4 products.
- [ ] ERD and `init.sql` are consistent.

## 8. Testing requirements
- Run the SQL validation above and paste the `SELECT` output in an issue comment.
- Try inserting an order item with `quantity = 0` and confirm the CHECK constraint rejects it.
- Try deleting a product used in an order and confirm `RESTRICT` blocks it.

## 9. Expected deliverables
- Approved ERD and reference SQL.
- Issue comment with validation output.
- PR with any changes.

## 10. Definition of Done
- [ ] Acceptance criteria met
- [ ] Validation output posted
- [ ] PR reviewed and merged (or "no changes needed" recorded)
- [ ] Card moved to **Done**

### Review questions
- Why is `ORDER_ITEMS` needed instead of a `products` column on `orders`?
- If the price of Cow Milk 1 L changes to ₹65 tomorrow, what happens to yesterday's orders?
