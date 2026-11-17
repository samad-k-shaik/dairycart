<!-- issue-meta
title: Admin: delivery boys with area (PIN code) allocation
labels: 
milestone: M8 – Ordering, Subscriptions and Delivery Operations
-->
# Admin: delivery boys with area (PIN code) allocation

**GitHub issue:** #103 · **Milestone:** M8 – Ordering, Subscriptions and Delivery Operations

## Objective

The admin keeps a list of delivery boys and allocates delivery areas (PIN codes) to them, so each day's deliveries are split per delivery boy.

## Scope

**Admin → Delivery boys** (`/admin/delivery-boys`)
- List: name, phone, active/inactive, areas (PIN codes with optional locality name), today's order count.
- Add / edit (name, 10-digit phone, active) and delete a delivery boy (deleting frees his areas).
- Allocate / remove areas. **One delivery boy per PIN code.**
- Inactive delivery boys keep their areas, but their orders show as "Not assigned".

**Admin → Deliveries**
- Each card shows its delivery boy (matched by the order's PIN code) or "Not assigned".
- Filter: All / each delivery boy (with counts) / Not assigned; "To load" totals follow the filter.

## Not in scope
- Delivery boys do **not** log in (no delivery partner app, which stays out of scope per AGENTS.md).
- Routes, maps, payouts, attendance.

## Data / API
- Tables `delivery_boys`, `delivery_areas` (pincode UNIQUE); `orders.delivery_pincode` and `subscriptions.delivery_pincode` (copied from the address; existing rows filled from the address text by the migration).
- Allocation is looked up when reading (moving an area moves today's orders too); it is not stored on orders.
- ADMIN only: `GET/POST /admin/delivery-boys`, `PATCH/DELETE /admin/delivery-boys/{id}`, `POST /admin/delivery-boys/{id}/areas`, `DELETE /admin/delivery-boys/{id}/areas/{pincode}`; `GET /admin/deliveries?boy=<id>|unassigned` plus per-boy counts.

## Acceptance criteria
- [ ] Alembic migration (incl. PIN backfill)
- [ ] One boy per PIN code (409 with the current owner's name), phone and PIN validation
- [ ] Deliveries show the boy, filter by boy, totals per boy
- [ ] pytest; frontend helper tests; typecheck/build; browser check at 360px and desktop
- [ ] Docs: API contract, ERD, init.sql, requirements, scope, READMEs
