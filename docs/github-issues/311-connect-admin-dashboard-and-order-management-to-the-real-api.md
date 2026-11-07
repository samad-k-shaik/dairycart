<!-- issue-meta
title: [M3-11] Connect admin dashboard and order management to the real API
labels: frontend
milestone: M3 – Order Management
-->
# [M3-11] Connect admin dashboard and order management to the real API

**Milestone:** M3 – Order Management · **Priority:** High · **Estimated effort:** 2–3 hours

## 1. Objective
Use the real admin endpoints for the dashboard counts, orders table, details and status updates.

## 2. Background
Completes the admin flow (FR-A1 to FR-A5).

## 3. Learning objectives
- Mutations with optimistic or refetch-based updates
- Keeping filters and pagination in sync with the server

## 4. Prerequisites
- M3-07 and M3-09 merged

## 5. Tasks
- [ ] Implement admin service functions with `apiClient`
- [ ] After a status update, refetch the list, details and dashboard counts
- [ ] Show the backend message on a 409 transition error
- [ ] Use `GET /products?include_unavailable=true` for the admin products page

## 6. Technical guidance
Prefer simple refetch over optimistic updates for this POC.

## 7. Acceptance criteria
- [ ] An admin can move an order PLACED → DELIVERED and the dashboard counts update
- [ ] Invalid transitions show the backend error

## 8. Testing requirements
- Manual run; screenshots of each step

## 9. Expected deliverables
- Updated admin services and pages

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Why refetch instead of updating the cache by hand?
