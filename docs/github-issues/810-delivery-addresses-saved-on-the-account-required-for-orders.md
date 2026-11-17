<!-- issue-meta
title: Delivery addresses: saved on the account, required for orders and subscriptions
labels: 
milestone: M8 – Ordering, Subscriptions and Delivery Operations
-->
# Delivery addresses: saved on the account, required for orders and subscriptions

**GitHub issue:** #102 · **Milestone:** M8 – Ordering, Subscriptions and Delivery Operations

## Objective

Customers save delivery addresses on their account and must choose one for every order and subscription. Approved scope change (the scope previously said "no address fields").

## Scope

**Customer**
- Account page → **Addresses** tab: add, edit, delete, make default. Fields: label (Home / Office…), house / flat, street / area, landmark (optional), city, 6-digit PIN code. First address = default; deleting the default makes another one default. Max 10 per user.
- Checkout (Order once and Subscribe): required **Delivery address** (saved addresses, default preselected, "+ Add new address").
- My subscriptions: address shown + **Change address** (applies to deliveries not created yet).
- Order page shows the delivery address.

**Admin**
- Order details panel shows the delivery address.

## Rules
- Orders and subscriptions store a **text copy** of the address (`delivery_address`), like locked prices: editing/deleting an address never changes past orders.
- `address_id` must belong to the logged-in user (otherwise 422 on `address_id`).
- Old orders/subscriptions: no address ("No address recorded").

## API (login required, /api/v1)
- `GET/POST /addresses`, `PATCH/DELETE /addresses/{id}`, `POST /addresses/{id}/default`
- `POST /orders`, `POST /subscriptions`: required `address_id`
- `PATCH /subscriptions/{id}/address`
- Responses include `delivery_address`

## Acceptance criteria
- [ ] Alembic migration: `addresses` table (one default per user), `orders.delivery_address`, `subscriptions.delivery_address`
- [ ] Address CRUD with default rules, limit, PIN validation, own-addresses-only
- [ ] Orders/subscriptions require an address; automatic subscription orders copy it
- [ ] pytest; frontend helper tests; typecheck/build; browser check at 360px and desktop
- [ ] Docs: API contract, ERD, init.sql, functional requirements, scope

## Out of scope
Maps / geolocation, address verification, delivery zones or charges.
