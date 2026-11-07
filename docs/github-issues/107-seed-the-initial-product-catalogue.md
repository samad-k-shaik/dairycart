<!-- issue-meta
title: [M1-07] Seed the initial product catalogue
labels: backend, database, good-first-issue
milestone: M1 – Backend Foundation
-->
# [M1-07] Seed the initial product catalogue

**Milestone:** M1 – Backend Foundation · **Priority:** Medium · **Estimated effort:** 1–2 hours

## 1. Objective
Provide a repeatable, idempotent way to load the four products and the demo customer into a fresh database.

## 2. Background
Developers, tests and the demo all need the same starting data. The seed must be safe to run twice.

## 3. Learning objectives
- Seed data vs migrations
- Idempotency (`ON CONFLICT DO NOTHING` / "get or create")

## 4. Prerequisites
- M1-06 merged

## 5. Tasks
- [ ] Create `backend/app/scripts/seed.py` (run with `python -m app.scripts.seed`) inserting products from `database/seed.sql`
- [ ] Make it idempotent
- [ ] Document usage in `database/README.md`

## 6. Technical guidance
Reuse the session factory from M1-04. Keep prices identical to `docs/01-project-overview.md` (₹30, ₹60, ₹35, ₹70).

## 7. Acceptance criteria
- [ ] Running the seed twice results in exactly 4 products and 1 demo customer
- [ ] Prices and sizes match the catalogue

## 8. Testing requirements
- Run the seed twice and paste `SELECT name, size, price FROM products;`

## 9. Expected deliverables
- `app/scripts/seed.py`, updated README

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Why is seed data not part of the schema migration?
