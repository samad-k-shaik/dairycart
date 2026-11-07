<!-- issue-meta
title: [M0] Prepare high-level and low-level architecture documentation
labels: documentation, architecture
milestone: M0 – Project Foundation
-->
# [M0] Prepare high-level and low-level architecture documentation

> **Initial draft status:** Drafts exist in `docs/04-architecture/system-context.md`, `high-level-design.md` and `low-level-design.md`. This issue covers **reviewing, understanding and approving** them, including the proposed ADRs.

## 1. Objective
Document how the system is structured: components, responsibilities, communication, data flow, local and GCP architecture (HLD), and how code is organized inside the frontend and backend (LLD).

## 2. Background
Architecture documentation lets everyone (and every AI assistant) make consistent decisions. We use a **modular monolith**: one React app, one FastAPI service, one PostgreSQL database, with clear internal layers. Microservices are explicitly rejected for a POC of this size.

## 3. Learning objectives
- Understand three-tier architecture (UI → API → database).
- Understand a modular monolith vs microservices.
- Understand backend layering: **router → service → repository → model**.
- Understand the API request lifecycle and where validation and errors are handled.
- Understand database transactions and why order creation must be atomic.
- Understand Architecture Decision Records (ADRs).

## 4. Prerequisites
- Issue #2 (requirements) reviewed.

## 5. Tasks
- [ ] Review the system context diagram: actors and external systems.
- [ ] Review the HLD: logical diagram, component responsibilities, communication table, order data-flow sequence diagram.
- [ ] Review local development and future GCP architecture diagrams.
- [ ] Review the LLD: frontend folder rules, backend modules, request lifecycle, validation layers, error mapping, transaction handling.
- [ ] Review the ADR table. Decide on the **Proposed** ADRs, especially ADR-005 (order history endpoint) and ADR-006 (`include_unavailable`).
- [ ] Record decisions in the ADR table via PR.

## 6. Technical guidance
- A rule of thumb from the LLD: if a rule still applies when called from a CLI script instead of HTTP, it belongs in a **service**.
- The pseudocode in LLD §6 is illustrative only; it is implemented in M3.
- Do not add frameworks or services without an ADR.

## 7. Acceptance criteria
- [ ] HLD contains the React UI → FastAPI → PostgreSQL diagram, component responsibilities, communication, data flow, external dependencies, local and GCP architecture.
- [ ] LLD covers frontend structure, backend modules, request lifecycle, business logic separation, DB access patterns, error handling, validation and transactions.
- [ ] All diagrams are Mermaid and render on GitHub.
- [ ] Every ADR has status Accepted or Rejected (no Proposed items for M1/M3 scope).
- [ ] Tech lead / project lead approves.

## 8. Testing requirements
- Walk-through: a participant traces `POST /api/v1/orders` through every layer using only the docs.
- Mermaid diagrams render without errors.

## 9. Expected deliverables
- Approved architecture documents with ADR decisions recorded.
- PR referencing this issue.

## 10. Definition of Done
- [ ] Acceptance criteria met
- [ ] PR reviewed and merged into `develop`
- [ ] Card moved to **Done**

### Review questions
- What would go wrong if routers queried the database directly?
- What happens to the order if saving the second order item fails?
- Why one React app for both customer and admin?
