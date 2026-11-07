<!-- issue-meta
title: [M2-03] Define TypeScript types and mock JSON data from the API contract
labels: frontend
milestone: M2 – Frontend Foundation
-->
# [M2-03] Define TypeScript types and mock JSON data from the API contract

**Milestone:** M2 – Frontend Foundation · **Priority:** High · **Estimated effort:** 2–3 hours

## 1. Objective
Create TypeScript types that mirror the API contract and realistic mock data, plus mock service functions that M3 can later swap for real HTTP calls.

## 2. Background
Building against mock data that exactly matches the contract means connecting the real backend in M3 will be a small change, not a rewrite.

## 3. Learning objectives
- TypeScript `type`/`interface`, union types (`OrderStatus`)
- Separating data access (services) from UI
- Simulating network latency and errors with Promises

## 4. Prerequisites
- M2-01 merged
- Read `docs/05-api/api-contracts.md`

## 5. Tasks
- [ ] Create `src/types/` with `Product`, `Order`, `OrderItem`, `OrderSummary`, `OrderStatus`, `ApiError`, `AdminOrderPage`
- [ ] Create `src/services/mock/` JSON with the 4 products and ~8 orders across all statuses
- [ ] Create `productService.ts` and `orderService.ts` returning Promises with a 300 ms delay
- [ ] Keep money as strings (`"60.00"`) like the API
- [ ] Add `src/lib/format.ts` with `formatCurrency("60.00") → "₹60.00"`

## 6. Technical guidance
Field names must be `snake_case` exactly as in the contract. Pages must never import mock JSON directly; only services do.

## 7. Acceptance criteria
- [ ] Types compile and match the contract field-for-field
- [ ] Services can be switched to HTTP later without changing pages
- [ ] `formatCurrency` handles `"155.00"` → `₹155.00`

## 8. Testing requirements
- `npm run typecheck` passes
- Unit test for `formatCurrency` (set up properly in M4; a simple test is fine now)

## 9. Expected deliverables
- `src/types/*`, `src/services/*`, mock data, `src/lib/format.ts`

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Why do pages call services instead of importing JSON?
