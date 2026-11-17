<!-- issue-meta
title: Subscriptions: delivery time slots managed by the admin
labels: 
milestone: M8 – Ordering, Subscriptions and Delivery Operations
-->
# Subscriptions: delivery time slots managed by the admin

**GitHub issue:** #100 · **Milestone:** M8 – Ordering, Subscriptions and Delivery Operations

## Objective

A subscriber chooses a **delivery time slot** for their subscription deliveries. The admin manages the slots (times and how many subscriptions each slot can take).

## Scope

**Admin – Delivery slots page**
- List slots with their time, capacity, how many active subscriptions booked them, and on/off.
- Add, edit (name, start/end time, capacity, on/off) and delete slots.
- A slot that was ever booked cannot be deleted; switch it off instead (hidden from new subscribers, existing bookings keep it).
- The last active slot cannot be switched off or deleted, so customers always have a slot to choose.
- Two standard slots exist from the start (created by the migration), editable by the admin: **Morning 08:00–09:00** and **Evening 17:00–18:00**, capacity 50 each.

**Customer**
- Checkout → Subscribe: choosing a delivery time is required. Each slot shows the spaces left; a full slot shows "Full" and cannot be chosen.
- My subscriptions: "Change time" on an active plan; applies to delivery orders not created yet.
- "Order once" is unchanged (no slot).

**Orders**
- Each automatic subscription order stores the slot's name and time (like locked prices: editing the slot later does not change old orders).
- Admin Subscriptions and Orders lists and the order details show the delivery time.

## Rules
- Capacity = maximum number of ACTIVE subscriptions in the slot. Cancelled / completed plans free their place.
- No overbooking: the slot row is locked while booking (SELECT … FOR UPDATE).
- If the admin lowers capacity below the current bookings, nobody loses their booking; the slot just shows Full.
- Subscriptions from before this change have no slot ("No time chosen") and can choose one with "Change time".

## API (under /api/v1)
- `GET /delivery-slots` – active slots with spaces left
- `GET/POST /admin/delivery-slots`, `PATCH/DELETE /admin/delivery-slots/{id}` – ADMIN only
- `POST /subscriptions` – new required `delivery_slot_id`
- `PATCH /subscriptions/{id}/delivery-slot` – change the time (owner or ADMIN)
- Errors: `DELIVERY_SLOT_FULL` (409), `DELIVERY_SLOT_IN_USE` (409), `LAST_ACTIVE_DELIVERY_SLOT` (409), `DELIVERY_SLOT_ALREADY_EXISTS` (409), unavailable slot → 422

## Acceptance criteria
- [ ] Alembic migration: `delivery_slots` table with the two standard slots, `subscriptions.delivery_slot_id`, `orders.delivery_slot`
- [ ] Admin can add / edit / switch off / delete slots with the rules above
- [ ] Subscriber must pick an available, not-full slot at checkout and can change it later
- [ ] Automatic orders carry the slot; admin and customer pages show it
- [ ] pytest for the rules and endpoints; frontend helper tests; typecheck, lint, build pass
- [ ] Docs: API contract, ERD, init.sql, functional requirements

## Out of scope
Time slots for one-time orders, per-day slot changes, delivery-partner routing.
