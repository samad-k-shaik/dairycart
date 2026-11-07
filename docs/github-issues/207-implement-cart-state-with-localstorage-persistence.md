<!-- issue-meta
title: [M2-07] Implement cart state with localStorage persistence
labels: frontend
milestone: M2 – Frontend Foundation
-->
# [M2-07] Implement cart state with localStorage persistence

**Milestone:** M2 – Frontend Foundation · **Priority:** High · **Estimated effort:** 3–4 hours

## 1. Objective
Implement a cart (add, merge, update quantity, remove, clear, estimated total) using React context and `localStorage`, exposed via a `useCart()` hook.

## 2. Background
ADR-004 keeps the cart in the browser. The estimated total is for display only; the backend calculates the real total at checkout.

## 3. Learning objectives
- React Context and custom hooks
- `useReducer` for predictable state updates
- Persisting state in `localStorage` safely (try/catch)
- Decimal-safe arithmetic with money strings (work in paise as integers)

## 4. Prerequisites
- M2-06 merged

## 5. Tasks
- [ ] Create `CartProvider` and `useCart()` in `src/hooks/`
- [ ] Actions: `add(product, qty)` (merges same product, caps at 20), `setQuantity`, `remove`, `clear`
- [ ] Persist and restore from `localStorage` key `milk-cart-v1`
- [ ] Show cart item count in the header
- [ ] Wire "Add to cart" on home and details pages; show a toast

## 6. Technical guidance
Store only `product_id`, `quantity` and a display snapshot (name, size, price). Convert `"60.00"` to `6000` paise for sums to avoid floating-point errors.

## 7. Acceptance criteria
- [ ] Adding the same product twice increases quantity (max 20)
- [ ] Cart survives a page refresh
- [ ] Corrupt `localStorage` data does not crash the app
- [ ] Header count updates immediately

## 8. Testing requirements
- Unit tests for the reducer (add, merge, cap, remove, clear)
- Manual refresh test

## 9. Expected deliverables
- `CartProvider`, `useCart`, reducer tests

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Why calculate in paise instead of rupees with decimals?
