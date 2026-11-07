<!-- issue-meta
title: [M4-03] Add database constraint and migration tests
labels: backend, database, testing
milestone: M4 – Testing and Quality
-->
# [M4-03] Add database constraint and migration tests

**Milestone:** M4 – Testing and Quality · **Priority:** Medium · **Estimated effort:** 2–4 hours

## 1. Objective
Prove that migrations apply cleanly and that database constraints reject invalid data even if application code is bypassed.

## 2. Background
The database is the last line of defence (LLD §7).

## 3. Learning objectives
- Testing constraints with raw inserts
- Upgrade/downgrade testing

## 4. Prerequisites
- M4-01 merged

## 5. Tasks
- [ ] Test `alembic upgrade head` → `downgrade base` → `upgrade head` on an empty database
- [ ] Tests for CHECK (quantity, price, status), UNIQUE (phone, name+size, order+product) and FK RESTRICT

## 6. Technical guidance
Expect `IntegrityError` and roll back after each.

## 7. Acceptance criteria
- [ ] All constraints from the ERD have a test

## 8. Testing requirements
- `pytest tests/db -q` output

## 9. Expected deliverables
- `backend/tests/db/` tests

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Why test the database separately from the API?
