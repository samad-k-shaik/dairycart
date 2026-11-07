<!-- issue-meta
title: [M2-10] Build the customer order history page
labels: frontend
milestone: M2 – Frontend Foundation
-->
# [M2-10] Build the customer order history page

**Milestone:** M2 – Frontend Foundation · **Priority:** Medium · **Estimated effort:** 2–4 hours

## 1. Objective
Build an order history page where the customer enters a phone number and sees their orders (newest first) and can open order details with a status timeline.

## 2. Background
Implements FR-C7 using the proposed `GET /api/v1/orders?phone=` endpoint (mocked for now).

## 3. Learning objectives
- Query parameters in the URL (`/orders?phone=...`)
- Conditional queries (`enabled` in `useQuery`)
- Visualising a status lifecycle

## 4. Prerequisites
- M2-09 merged

## 5. Tasks
- [ ] Phone lookup form (remember last phone in `localStorage`)
- [ ] Order cards with date (IST), total, item count and `StatusBadge`
- [ ] Order details view with items and a timeline: Placed → Confirmed → Out for delivery → Delivered (or Cancelled)
- [ ] Empty state when no orders are found

## 6. Technical guidance
No ratings or reviews (out of scope). Use the status badge colours from the design system.

## 7. Acceptance criteria
- [ ] Orders appear newest first
- [ ] Timeline highlights the current status correctly for all five statuses
- [ ] Empty and error states are shown

## 8. Testing requirements
- Screenshots for an order in each status

## 9. Expected deliverables
- `OrderHistoryPage`, `StatusBadge`, `OrderTimeline`

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- How does the timeline handle a cancelled order?
