<!-- issue-meta
title: [M3-12] End-to-end walkthrough of the customer and admin flows
labels: testing, documentation
milestone: M3 – Order Management
-->
# [M3-12] End-to-end walkthrough of the customer and admin flows

**Milestone:** M3 – Order Management · **Priority:** Medium · **Estimated effort:** 1–2 hours

## 1. Objective
Run and record a full manual walkthrough of both flows against the integrated system and log any bugs.

## 2. Background
Confirms M3 delivers the POC success criteria before formal testing in M4.

## 3. Learning objectives
- Exploratory testing
- Writing good bug reports

## 4. Prerequisites
- M3-01 to M3-11 merged

## 5. Tasks
- [ ] Customer flow from a fresh database to order history
- [ ] Admin flow through every status, including a cancellation
- [ ] Try edge cases (empty cart, invalid phone, unavailable product, invalid transition)
- [ ] Raise a `bug` issue for every problem found

## 6. Technical guidance
Use the Bug issue template and include the `request_id` from error responses.

## 7. Acceptance criteria
- [ ] Walkthrough notes posted on this issue
- [ ] All found bugs logged

## 8. Testing requirements
- This issue is the test

## 9. Expected deliverables
- Walkthrough notes, bug issues

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Deliverables committed or linked in the issue
- [ ] Reviewed by another participant / project lead
- [ ] Card moved to **Done**

### Explain during review
- Which bug surprised you most?
