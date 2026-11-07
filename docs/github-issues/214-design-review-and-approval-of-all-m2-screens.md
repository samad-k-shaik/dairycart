<!-- issue-meta
title: [M2-14] Design review and approval of all M2 screens
labels: frontend, documentation
milestone: M2 – Frontend Foundation
-->
# [M2-14] Design review and approval of all M2 screens

**Milestone:** M2 – Frontend Foundation · **Priority:** High · **Estimated effort:** 1–2 hours (meeting)

## 1. Objective
Review every screen against the design system and requirements and get project-owner approval before M3 connects real APIs.

## 2. Background
The design approval gate (design system doc) prevents rework: once real APIs are wired in, visual changes are more expensive.

## 3. Learning objectives
- Running a design review
- Giving and receiving UI feedback
- Accessibility basics (contrast, focus, labels)

## 4. Prerequisites
- M2-01 to M2-13 merged

## 5. Tasks
- [ ] Collect mobile and desktop screenshots of all screens into `docs/06-ui-ux/screens/`
- [ ] Check each screen against the design system (font, colours, radius, spacing)
- [ ] Check out-of-scope elements are absent (payments, coupons, ratings, shipping)
- [ ] Run a quick keyboard-only and Lighthouse accessibility check
- [ ] Record feedback as new issues; record approval as a comment

## 6. Technical guidance
Approval is given by the project owner. Minor issues can become follow-up issues instead of blocking approval.

## 7. Acceptance criteria
- [ ] Screenshots of all screens committed
- [ ] Project owner approval comment on this issue
- [ ] Follow-up issues created for any feedback

## 8. Testing requirements
- Lighthouse accessibility score recorded for home and checkout

## 9. Expected deliverables
- `docs/06-ui-ux/screens/*.png`, approval comment, follow-up issues

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Deliverables committed or linked in the issue
- [ ] Reviewed by another participant / project lead
- [ ] Card moved to **Done**

### Explain during review
- Which design rule was hardest to keep consistent, and why?
