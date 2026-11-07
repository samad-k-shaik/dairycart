<!-- issue-meta
title: [M2-06] Build the product details page with a quantity selector
labels: frontend
milestone: M2 – Frontend Foundation
-->
# [M2-06] Build the product details page with a quantity selector

**Milestone:** M2 – Frontend Foundation · **Priority:** High · **Estimated effort:** 2–4 hours

## 1. Objective
Build the product details page with large image, name, size, price, description and a reusable `QuantitySelector` (1–20).

## 2. Background
Implements FR-C2 and FR-C3. The quantity selector is reused in the cart.

## 3. Learning objectives
- Route parameters (`useParams`)
- Controlled components and component state
- Enforcing input bounds in the UI

## 4. Prerequisites
- M2-05 merged

## 5. Tasks
- [ ] Create `useProduct(id)` hook
- [ ] Build `QuantitySelector` (− / value / +, min 1, max 20, 44 px touch targets, accessible labels)
- [ ] Build the details page; sticky "Add to cart" bar on mobile
- [ ] Show "Product not found" for unknown ids

## 6. Technical guidance
Use `aria-label` on the − and + buttons. Disable − at 1 and + at 20.

## 7. Acceptance criteria
- [ ] Quantity cannot go below 1 or above 20
- [ ] Unknown id shows a friendly not-found state
- [ ] Layout matches design on mobile and desktop

## 8. Testing requirements
- Manual test of bounds and not-found; screenshots

## 9. Expected deliverables
- `QuantitySelector`, `useProduct`, `ProductDetailsPage`

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Why must the backend still validate quantity even though the UI does?
