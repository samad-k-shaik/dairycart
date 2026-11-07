<!-- issue-meta
title: [M2-11] Build the admin dashboard page
labels: frontend
milestone: M2 – Frontend Foundation
-->
# [M2-11] Build the admin dashboard page

**Milestone:** M2 – Frontend Foundation · **Priority:** High · **Estimated effort:** 2–4 hours

## 1. Objective
Build the admin dashboard with stat cards (total orders, today's orders, count per status) and a recent orders list.

## 2. Background
Implements FR-A1 using `status_counts` from the admin orders response (mocked).

## 3. Learning objectives
- Reusable stat card components
- Deriving "today" in the IST time zone

## 4. Prerequisites
- M2-04 and M2-03 merged

## 5. Tasks
- [ ] Create `useAdminOrders()` hook (mock)
- [ ] `StatCard` component with icon, label and number
- [ ] Cards for total, today, and each status
- [ ] Recent 5 orders list linking to order management

## 6. Technical guidance
Keep charts out of scope; numbers and badges are enough for the POC.

## 7. Acceptance criteria
- [ ] Counts match the mock data
- [ ] Responsive on mobile (cards stack) and desktop (grid)

## 8. Testing requirements
- Screenshots mobile and desktop

## 9. Expected deliverables
- `DashboardPage`, `StatCard`, `useAdminOrders`

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Where do the status counts come from in the API?
