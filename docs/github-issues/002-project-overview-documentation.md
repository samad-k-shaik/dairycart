<!-- issue-meta
title: [M0] Prepare project overview, scope and requirements documentation
labels: documentation, good-first-issue
milestone: M0 – Project Foundation
-->
# [M0] Prepare project overview, scope and requirements documentation

> **Initial draft status:** Drafts exist in `docs/01-project-overview.md`, `docs/02-project-scope.md` and `docs/03-requirements/`. This issue covers **reviewing, improving and approving** them.

## 1. Objective
Produce clear, beginner-friendly documents that describe what the Milk Delivery POC is, who it is for, what is in and out of scope, and the functional and non-functional requirements.

## 2. Background
Teams that skip requirements build the wrong thing. These documents are the single source of truth for "what are we building?". Every later issue traces back to a requirement ID (e.g. `FR-C5`).

## 3. Learning objectives
- Distinguish **functional** requirements (what the system does) from **non-functional** requirements (how well it does it).
- Write testable acceptance criteria.
- Understand scope control and why exclusions are documented.
- Use MoSCoW prioritization.
- Read a state diagram (order status lifecycle).

## 4. Prerequisites
- Issue #1 (repository structure) reviewed.

## 5. Tasks
- [ ] Read `docs/01-project-overview.md`; check business scenario, users, catalogue, milestones and glossary.
- [ ] Read `docs/02-project-scope.md`; confirm all 7 customer and 5 admin capabilities and all 11 exclusions are listed.
- [ ] Review `functional-requirements.md`: every requirement has an ID, priority and testable acceptance criteria.
- [ ] Review the order status lifecycle and business rules BR-1…BR-6.
- [ ] Review `non-functional-requirements.md`: every NFR has a verification method.
- [ ] Check the traceability table maps every requirement to an endpoint and screen.
- [ ] Raise questions as comments; fix gaps via PR.

## 6. Technical guidance
- Good acceptance criteria are observable: "Quantity selector allows 1–20" ✅ vs "Quantity selection works well" ❌.
- Mermaid diagrams render on GitHub; preview them in the GitHub file view or <https://mermaid.live>.
- Note the documented assumption that there is **no login** in the POC, and the security risk it creates (NFR-10).

## 7. Acceptance criteria
- [ ] Overview explains what, why, who and the learning goals in plain language.
- [ ] Scope lists all in-scope capabilities and all exclusions with reasons.
- [ ] Every functional requirement has an ID, priority and acceptance criteria.
- [ ] Every NFR has a measurable target and verification method.
- [ ] Order status transitions are documented in a table and a diagram.
- [ ] Project lead approves the documents.

## 8. Testing requirements
- Peer read-through: a second participant reads the docs and can explain the customer flow and admin flow without help.
- All Mermaid diagrams render on GitHub.
- All relative links work.

## 9. Expected deliverables
- Approved `docs/01-project-overview.md`, `docs/02-project-scope.md`, `docs/03-requirements/*.md`.
- PR with any changes, referencing this issue.

## 10. Definition of Done
- [ ] Acceptance criteria met
- [ ] PR reviewed and merged into `develop` (or "no changes needed" recorded)
- [ ] Card moved to **Done**

### Review questions
- Why must the backend, not the frontend, calculate the order total?
- Give one example each of a functional and non-functional requirement.
- Why can't a `DELIVERED` order go back to `PLACED`?
