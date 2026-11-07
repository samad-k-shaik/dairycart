<!-- issue-meta
title: [M4-10] Run accessibility and Lighthouse review
labels: frontend, testing
milestone: M4 – Testing and Quality
-->
# [M4-10] Run accessibility and Lighthouse review

**Milestone:** M4 – Testing and Quality · **Priority:** Medium · **Estimated effort:** 2–3 hours

## 1. Objective
Reach a Lighthouse accessibility score of at least 90 on key pages and fix the issues found (NFR-2, NFR-4).

## 2. Background
Accessible apps work better for everyone, including on small phones and slow networks.

## 3. Learning objectives
- Lighthouse audits
- Colour contrast, focus order, labels, alt text

## 4. Prerequisites
- M3 complete

## 5. Tasks
- [ ] Audit home, product details, cart, checkout and admin orders (mobile mode)
- [ ] Fix contrast, label, alt text and focus issues
- [ ] Record before/after scores in the PR

## 6. Technical guidance
Run audits on a production build (`npm run build && npm run preview`).

## 7. Acceptance criteria
- [ ] Accessibility ≥ 90 on all audited pages

## 8. Testing requirements
- Lighthouse screenshots before/after

## 9. Expected deliverables
- Fixes and scores

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Which fix improved the score most?
