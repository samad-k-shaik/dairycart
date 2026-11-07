<!-- issue-meta
title: [M2-08] Build the shopping cart page
labels: frontend
milestone: M2 – Frontend Foundation
-->
# [M2-08] Build the shopping cart page

**Milestone:** M2 – Frontend Foundation · **Priority:** High · **Estimated effort:** 2–4 hours

## 1. Objective
Build the cart page listing items with quantity controls, line subtotals, an estimated total and a Checkout button, plus an empty state.

## 2. Background
Implements FR-C4. The cart summary must say the final total is confirmed at checkout.

## 3. Learning objectives
- Lists and keys in React
- Derived state (subtotals computed from cart data)
- Empty-state design

## 4. Prerequisites
- M2-07 merged

## 5. Tasks
- [ ] Build `CartItem` (image, name, size, unit price, `QuantitySelector`, remove)
- [ ] Build `CartSummary` (estimated total, note "Final total confirmed at checkout", Checkout button)
- [ ] Empty state with a "Browse products" link
- [ ] Two-column layout on desktop, stacked on mobile

## 6. Technical guidance
No discount codes, shipping costs or tax lines; they are out of scope.

## 7. Acceptance criteria
- [ ] Changing quantity updates line subtotal and estimated total
- [ ] Removing the last item shows the empty state
- [ ] Checkout is disabled when the cart is empty

## 8. Testing requirements
- Screenshots of filled and empty cart, mobile and desktop

## 9. Expected deliverables
- `CartItem`, `CartSummary`, `CartPage`

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Why is the total called "estimated" here?
