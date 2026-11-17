<!-- issue-meta
title: Admin: one Orders board (combine Orders and Deliveries) in a card layout
labels: 
milestone: M8 – Ordering, Subscriptions and Delivery Operations
-->
# Admin: one Orders board (combine Orders and Deliveries) in a card layout

**GitHub issue:** #104 · **Milestone:** M8 – Ordering, Subscriptions and Delivery Operations

## Objective

Combine the admin **Orders** and **Deliveries** pages into one **Orders board** in a card layout: status chips with counts, search, a day picker (Today by default, or All dates), a delivery boy filter, and one card per order.

## Scope

- Status chips with counts: All · Placed · Confirmed · Out for delivery · Delivered · Cancelled (counts follow the day, delivery boy and search).
- Search: customer name, phone or order number.
- Date: Today (default), previous / next day, date picker, or **All dates** (newest first, "Load more").
- Delivery boy filter: All / each delivery boy (count) / Not assigned.
- Card: customer name, #order, date and time, delivery time slot or "One-time", "Order (N)" with total, first 2 items with prices + "See more", coloured status badge. 4 / 2 / 1 per row (desktop / tablet / phone).
- Clicking a card opens the existing order panel (address, items, status change).
- The separate Deliveries page is removed; `/admin/deliveries` redirects to `/admin/orders`. "To load" totals and the delivery boy on each card are not kept (decided with the user).
- Dashboard unchanged.

## API
- `GET /admin/orders`: new optional `date` (India delivery day: subscription orders for that day + one-time orders placed that day), `boy` (id | `unassigned`), `q` (search). Rows gain items with prices, username, delivery date, PIN code and delivery boy. `status_counts` follow date/boy/q (unchanged without them); new `boy_counts`, `unassigned_count`.
- `GET /admin/deliveries` is removed.
- No database change.

## Acceptance criteria
- [ ] Board with chips, search, date / All dates, delivery boy filter, cards, panel on click
- [ ] pytest for filters, counts, search, row items
- [ ] Frontend helper tests; typecheck/build; browser check at 360 / 768 / 1280px
- [ ] Docs: API contract, requirements, READMEs
