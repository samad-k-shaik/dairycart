<!-- issue-meta
title: [M3-09] Connect product pages to the real API
labels: frontend
milestone: M3 – Order Management
-->
# [M3-09] Connect product pages to the real API

**Milestone:** M3 – Order Management · **Priority:** High · **Estimated effort:** 1–2 hours

## 1. Objective
Switch `productService` from mock data to the real product endpoints without changing pages.

## 2. Background
Proves the M2 service/mock separation works.

## 3. Learning objectives
- Swapping data sources behind an interface
- TanStack Query caching (`staleTime`)

## 4. Prerequisites
- M3-08 merged

## 5. Tasks
- [ ] Implement `getProducts` / `getProduct` with `apiClient`
- [ ] Set a sensible `staleTime` for products
- [ ] Verify home and details pages work with real data

## 6. Technical guidance
If a page needs changing, the service boundary leaked; fix it rather than patching the page.

## 7. Acceptance criteria
- [ ] Pages show products from the database
- [ ] Turning the backend off shows the error state

## 8. Testing requirements
- Manual test with backend on and off

## 9. Expected deliverables
- Updated `productService.ts`

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- How many page files changed, and why should the answer be zero?
