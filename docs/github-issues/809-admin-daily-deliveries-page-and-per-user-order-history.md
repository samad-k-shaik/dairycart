<!-- issue-meta
title: Admin: daily deliveries page and per-user order history
labels: 
milestone: M8 – Ordering, Subscriptions and Delivery Operations
-->
# Admin: daily deliveries page and per-user order history

**GitHub issue:** #101 · **Milestone:** M8 – Ordering, Subscriptions and Delivery Operations

## Objective

Give the admin (1) a daily view of what must be delivered and its status, per user, and (2) a page per user with all their orders.

## Scope

**Deliveries page** (`/admin/deliveries`)
- Date picker (default today, India time) with previous / next day.
- Product totals for the day (what to load), cancelled orders not counted.
- Status counts for the day.
- One row per order: user (name, phone, @username), products × quantity, delivery time slot (subscriptions), Subscription / One-time label, total, and a status control (existing status rules; cancelling restores stock).
- A day = subscription orders whose `delivery_date` is that day + one-time orders placed that day (India time). Sorted by delivery time, then customer.

**User details page** (`/admin/users/{id}`)
- Users on the Users page are clickable.
- Details (name, username, email, role, joined), totals (number of orders, amount spent excluding cancelled), subscriptions, and all orders newest first; clicking an order opens the existing order details panel.

## API (ADMIN only, under /api/v1)
- `GET /admin/deliveries?date=YYYY-MM-DD`
- `GET /admin/users/{id}` (404 if missing)
- `GET /admin/users/{id}/orders`
- `GET /admin/subscriptions?user_id=` (new optional filter)

No database changes, no new libraries.

## Acceptance criteria
- [ ] Deliveries page shows the right orders for a day, with product totals, status counts and status changes
- [ ] Selecting a user shows all their orders and subscriptions
- [ ] pytest for day boundaries (India midnight), totals without cancelled orders, admin-only access, 404
- [ ] Frontend helper tests; typecheck, build pass; checked at 360px and desktop
- [ ] Docs: API contract, functional requirements, READMEs

## Out of scope
Delivery partner app, routes/maps, printing, editing order items.
