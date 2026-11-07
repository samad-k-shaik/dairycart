<!-- issue-meta
title: [M3-10] Connect checkout, confirmation and order history to the real API
labels: frontend
milestone: M3 – Order Management
-->
# [M3-10] Connect checkout, confirmation and order history to the real API

**Milestone:** M3 – Order Management · **Priority:** High · **Estimated effort:** 3–4 hours

## 1. Objective
Use the real order endpoints for placing orders, showing confirmations and listing order history, including backend validation errors.

## 2. Background
Completes the customer flow end to end (FR-C5 to FR-C8).

## 3. Learning objectives
- Handling server-side validation errors in forms
- Cache invalidation after a mutation

## 4. Prerequisites
- M3-04, M3-05 and M3-09 merged

## 5. Tasks
- [ ] Implement `createOrder`, `getOrder`, `getOrdersByPhone` with `apiClient`
- [ ] Map 422 `details` to form field errors; show 409 messages (e.g. unavailable product)
- [ ] Invalidate order history queries after placing an order
- [ ] Show a notice if the confirmed total differs from the cart estimate (FR-C8)

## 6. Technical guidance
Prices are never sent. Use the total from the response everywhere after submission.

## 7. Acceptance criteria
- [ ] A customer can browse → order → see confirmation → see the order in history using the real backend
- [ ] Validation errors appear next to the right fields

## 8. Testing requirements
- Manual run of the flow; screenshots; paste the request payload

## 9. Expected deliverables
- Updated `orderService.ts` and pages

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- What happens if a product becomes unavailable while it is in the cart?
