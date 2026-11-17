<!-- issue-meta
title: Subscriptions: automatic daily orders and every 2 / 3 days delivery
labels: 
milestone: M8 – Ordering, Subscriptions and Delivery Operations
-->
# Subscriptions: automatic daily orders and every 2 / 3 days delivery

**GitHub issue:** #99 · **Milestone:** M8 – Ordering, Subscriptions and Delivery Operations

## Objective
Follow-up to #97:
1. **Automatic subscription orders.** Today an admin must press "Create today's subscription orders" every day, or no subscription deliveries are created. Replace the button with automatic creation and remove the button.
2. **Delivery frequency.** A subscription can deliver **every day, every 2 days or every 3 days**. Example: 1 week every 2 days = deliveries on days 1, 3, 5 and 7 (4 deliveries). The plan keeps its calendar length.

## Design
**Automatic orders (no new library)**
- When the backend starts, it launches a background task (`asyncio`) that runs `generate_orders_for(today in India)` at startup and then every 15 minutes.
- Safe to repeat and safe with several workers: `uq_orders_subscription_day` and the row locks from #97 already prevent duplicates.
- Settings: `SUBSCRIPTION_AUTO_ORDERS` (default `true`; `false` in tests) and `SUBSCRIPTION_ORDERS_INTERVAL_MINUTES` (default 15).
- Remove `POST /admin/subscriptions/generate-orders` and the admin button. The script `app.scripts.generate_subscription_orders` stays as a backup (e.g. to catch up a missed day).
- Update ADR-015.

**Frequency**
- `subscriptions.every_n_days` INTEGER NOT NULL DEFAULT 1, CHECK IN (1, 2, 3) (Alembic migration; existing subscriptions = every day).
- Delivery days: `start_date + k × every_n_days` up to `end_date`. Number of deliveries = `(days − 1) // every_n_days + 1`; plan total = daily total × deliveries.
- Order generation only creates orders on delivery days.
- API: `every_n_days` in the subscribe request (optional, default 1) and in the responses, plus `deliveries`.
- Checkout: frequency choice, the delivery dates and the plan total for that number of deliveries. My subscriptions and admin list show the frequency.

## Acceptance criteria
- [ ] No "Create today's subscription orders" button; subscription orders appear by themselves on their delivery days
- [ ] Running the job again never creates duplicates; a failing run is logged and retried on the next tick
- [ ] Every day / every 2 days / every 3 days can be chosen; orders are only created on delivery days
- [ ] Totals and delivery counts are calculated by the backend
- [ ] Docs: API contract, ERD, init.sql, requirements, ADR-015, READMEs

## Testing
- Backend pytest: frequency rules (delivery days, counts, totals, validation), the automatic job (runs once, safe to repeat, survives an error)
- Frontend: helpers for delivery dates and counts; typecheck and build
- Browser walkthrough: subscribe every 2 days → My subscriptions shows 4 deliveries; admin page has no button
