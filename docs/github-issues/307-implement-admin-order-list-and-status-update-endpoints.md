<!-- issue-meta
title: [M3-07] Implement admin order list and status update endpoints
labels: backend
milestone: M3 – Order Management
-->
# [M3-07] Implement admin order list and status update endpoints

**Milestone:** M3 – Order Management · **Priority:** High · **Estimated effort:** 3–4 hours

## 1. Objective
Implement `GET /api/v1/admin/orders` (filter, pagination, `status_counts`) and `PATCH /api/v1/admin/orders/{id}/status`.

## 2. Background
Powers the admin dashboard and order management screens (FR-A1 to FR-A4).

## 3. Learning objectives
- Pagination response design
- Aggregate queries (`GROUP BY status`)
- PATCH semantics

## 4. Prerequisites
- M3-05 and M3-06 merged

## 5. Tasks
- [ ] Create `app/routers/admin_orders.py` under `/admin`
- [ ] List with `status`, `page`, `page_size` (max 100), newest first, plus `status_counts` across all orders
- [ ] PATCH status using the service from M3-06

## 6. Technical guidance
POC note: admin routes are unauthenticated (NFR-10). Add a `# TODO(auth)` comment and keep all admin routes under `/admin` so a single dependency can protect them later.

## 7. Acceptance criteria
- [ ] Responses match the contract
- [ ] `page_size=101` returns 422

## 8. Testing requirements
- API tests for filtering, pagination, counts, valid/invalid status updates, unknown order

## 9. Expected deliverables
- Admin router and tests

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- How would you protect all `/admin` routes later with one change?
