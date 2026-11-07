<!-- issue-meta
title: [M2-04] Set up routing with customer and admin layouts
labels: frontend
milestone: M2 – Frontend Foundation
-->
# [M2-04] Set up routing with customer and admin layouts

**Milestone:** M2 – Frontend Foundation · **Priority:** High · **Estimated effort:** 2–4 hours

## 1. Objective
Add client-side routing with a customer layout (header with cart icon) and an admin layout (sidebar/top navigation), with placeholder pages for every screen.

## 2. Background
One React app hosts both route trees (ADR-002). Layouts give every page the same navigation and spacing.

## 3. Learning objectives
- Client-side routing and nested routes with layouts (`<Outlet />`)
- Responsive navigation (mobile header vs desktop)

## 4. Prerequisites
- M2-02 merged

## 5. Tasks
- [ ] Add React Router (record it as an ADR if not already listed)
- [ ] Customer routes `/`, `/products/:id`, `/cart`, `/checkout`, `/orders/:id/confirmation`, `/orders`
- [ ] Admin routes `/admin`, `/admin/orders`, `/admin/products`
- [ ] `CustomerLayout`: logo, nav, cart icon with item count placeholder
- [ ] `AdminLayout`: sidebar on desktop, top bar on mobile, links with Lucide icons
- [ ] 404 page for unknown routes

## 6. Technical guidance
Routing is not named in the original stack list, so add **ADR-011 React Router** to the HLD table in this PR with a one-line justification.

## 7. Acceptance criteria
- [ ] Every route renders its placeholder inside the right layout
- [ ] Navigation works on 360 px and 1280 px widths
- [ ] ADR added

## 8. Testing requirements
- Manually click through every route; record a short screen capture or screenshots

## 9. Expected deliverables
- `src/routes/`, `src/layouts/`, placeholder pages, ADR entry

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- What is a nested route and why use layouts?
