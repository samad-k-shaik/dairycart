<!-- issue-meta
title: [M4-04] Configure Vitest and React Testing Library
labels: frontend, testing
milestone: M4 – Testing and Quality
-->
# [M4-04] Configure Vitest and React Testing Library

**Milestone:** M4 – Testing and Quality · **Priority:** High · **Estimated effort:** 1–2 hours

## 1. Objective
Set up frontend unit and component testing with Vitest, React Testing Library and jsdom (ADR-009).

## 2. Background
Frontend logic (cart, formatting, transitions) needs fast automated tests.

## 3. Learning objectives
- Vitest configuration with Vite
- Testing components the way users use them

## 4. Prerequisites
- M3 complete

## 5. Tasks
- [ ] Install `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`
- [ ] Add `test` and `test:coverage` scripts
- [ ] Write a first test for `formatCurrency`
- [ ] Mark ADR-009 Accepted

## 6. Technical guidance
Prefer queries like `getByRole` and `getByLabelText` over test ids.

## 7. Acceptance criteria
- [ ] `npm test -- --run` passes

## 8. Testing requirements
- Paste test output

## 9. Expected deliverables
- Vitest config, setup file, first test

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Why query by role instead of CSS class?
