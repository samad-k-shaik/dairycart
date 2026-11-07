<!-- issue-meta
title: [M2-13] Add loading, empty and error states to every screen
labels: frontend
milestone: M2 – Frontend Foundation
-->
# [M2-13] Add loading, empty and error states to every screen

**Milestone:** M2 – Frontend Foundation · **Priority:** Medium · **Estimated effort:** 2–4 hours

## 1. Objective
Make every screen handle loading (skeletons), empty data and service errors consistently.

## 2. Background
Real networks are slow and fail. Good states make the app feel reliable and are part of the design approval checklist.

## 3. Learning objectives
- Skeleton loaders
- Error boundaries vs query error states
- Simulating slow and failing services

## 4. Prerequisites
- M2-05 to M2-12 merged

## 5. Tasks
- [ ] Add `Skeleton` component and use it on all data screens
- [ ] Add reusable `EmptyState` and `ErrorState` (with Retry)
- [ ] Add a dev-only switch in mock services to simulate errors and slow responses
- [ ] Add a top-level error boundary

## 6. Technical guidance
Error messages should use `ApiError.message` and never show raw technical errors to customers.

## 7. Acceptance criteria
- [ ] Every data screen has loading, empty and error states
- [ ] Retry re-runs the query

## 8. Testing requirements
- Screenshots of each state for at least home, cart, order history and admin orders

## 9. Expected deliverables
- `Skeleton`, `EmptyState`, `ErrorState`, error boundary

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- What is the difference between an empty state and an error state?
