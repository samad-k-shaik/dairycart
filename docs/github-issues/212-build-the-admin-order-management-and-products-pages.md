<!-- issue-meta
title: [M2-12] Build the admin order management and products pages
labels: frontend
milestone: M2 – Frontend Foundation
-->
# [M2-12] Build the admin order management and products pages

**Milestone:** M2 – Frontend Foundation · **Priority:** High · **Estimated effort:** 4–6 hours

## 1. Objective
Build the admin orders table (filter by status, pagination, details sheet, status update control) and the read-only admin products table.

## 2. Background
Implements FR-A2 to FR-A5. The status control must only offer allowed next statuses.

## 3. Learning objectives
- Data tables with shadcn/ui
- Pagination and filter state in the URL
- Encoding business rules (allowed transitions) in a single shared constant

## 4. Prerequisites
- M2-11 merged

## 5. Tasks
- [ ] Orders table (id, customer, phone, date, total, status) with status filter and pagination (20/page)
- [ ] Order details sheet with items and totals
- [ ] Status dropdown showing only allowed next statuses; mock update with toast
- [ ] `src/lib/orderStatus.ts` with `ALLOWED_TRANSITIONS` matching the requirements table
- [ ] Products table including unavailable products (read-only)
- [ ] On mobile, show orders as cards instead of a wide table

## 6. Technical guidance
The backend will also enforce transitions; the UI restriction is for usability only.

## 7. Acceptance criteria
- [ ] Filter and pagination work
- [ ] Final statuses (`DELIVERED`, `CANCELLED`) show no update options
- [ ] Products table shows availability
- [ ] Usable at 360 px width

## 8. Testing requirements
- Unit test for `ALLOWED_TRANSITIONS` helper
- Screenshots of table, details sheet and mobile cards

## 9. Expected deliverables
- `OrdersPage`, `OrderDetailsSheet`, `ProductsPage`, `orderStatus.ts`

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Why keep transitions in one shared constant?
