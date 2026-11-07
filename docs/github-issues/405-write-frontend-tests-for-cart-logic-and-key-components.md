<!-- issue-meta
title: [M4-05] Write frontend tests for cart logic and key components
labels: frontend, testing
milestone: M4 – Testing and Quality
-->
# [M4-05] Write frontend tests for cart logic and key components

**Milestone:** M4 – Testing and Quality · **Priority:** High · **Estimated effort:** 3–4 hours

## 1. Objective
Cover the cart reducer, `QuantitySelector`, `ProductCard`, checkout form validation and status-transition helper with tests.

## 2. Background
These are the frontend pieces with real logic.

## 3. Learning objectives
- Mocking services in component tests
- Testing user interactions

## 4. Prerequisites
- M4-04 merged

## 5. Tasks
- [ ] Cart reducer tests (add, merge, cap at 20, remove, clear, corrupt storage)
- [ ] `QuantitySelector` bounds test
- [ ] Checkout form shows validation messages and sends only ids + quantities
- [ ] `ALLOWED_TRANSITIONS` helper test

## 6. Technical guidance
Mock `orderService` to assert the request payload.

## 7. Acceptance criteria
- [ ] All listed behaviours tested and passing

## 8. Testing requirements
- `npm test -- --run` output

## 9. Expected deliverables
- Test files

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- How does the checkout test prove prices are not sent?
