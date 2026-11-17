<!-- issue-meta
title: Ordering options: one-time daily order and subscriptions (7/15/30 days) with cancel
labels: 
milestone: M8 – Ordering, Subscriptions and Delivery Operations
-->
# Ordering options: one-time daily order and subscriptions (7/15/30 days) with cancel

**GitHub issue:** #97 · **Milestone:** M8 – Ordering, Subscriptions and Delivery Operations

## Objective
Let customers choose how they order:
1. **Daily order** (exists today): a one-time order whenever they need it.
2. **Subscription**: the same items delivered every day for **1 week (7 days), 15 days or 1 month (30 days)**.
3. **Cancel subscription**: the user can cancel an active subscription at any time.

> Scope change: subscriptions were listed as out of scope in `docs/02-project-scope.md` and AGENTS.md. The participant confirmed the mentor/team approved this change. This issue updates the scope doc and adds an ADR.

## Out of scope (still)
Payments/prepayment, pausing or skipping single days, editing a running subscription, notifications, any new scheduler library or cloud job.

## Proposed design (to be confirmed before coding)
**Data (Alembic migration)**
- `subscriptions`: id, user_id → users, customer name + phone, plan (`WEEK` 7 / `HALF_MONTH` 15 / `MONTH` 30), start_date, end_date, status (`ACTIVE` / `CANCELLED` / `COMPLETED`), created_at, cancelled_at
- `subscription_items`: subscription_id, product_id, quantity, unit_price (Decimal, price locked when subscribing)
- `orders.subscription_id` (nullable FK) + `orders.delivery_date`; unique (subscription_id, delivery_date), so a day can never be ordered twice

**Daily orders without a scheduler**
- `subscription_service.generate_orders_for(date)` creates that day's orders for every ACTIVE subscription (reusing the order and stock logic). It is idempotent.
- Run by an ADMIN button "Create today's subscription orders" (`POST /api/v1/admin/subscriptions/generate-orders`) and by a script `app/scripts/generate_subscription_orders.py`.
- A day without enough stock is skipped and reported; the subscription goes on.

**API** (`/api/v1`)
- `POST /subscriptions`, `GET /subscriptions/mine`, `GET /subscriptions/{id}` (owner/admin), `POST /subscriptions/{id}/cancel`
- `GET /admin/subscriptions`, `POST /admin/subscriptions/generate-orders`

**Frontend**
- Checkout: "Order once" / "Subscribe" choice; plan chips 7 / 15 / 30 days; start date (default tomorrow); per-day total and plan total from the backend
- "My subscriptions" page: status, dates, items, days delivered, **Cancel subscription** with a confirm dialog
- Admin "Subscriptions" page: list plus the generate button with its result

## Acceptance criteria
- [ ] A logged-in user can still place a one-time order exactly as today
- [ ] A user can subscribe for 7, 15 or 30 days; totals are calculated by the backend from DB prices
- [ ] Generating orders for a date creates one order per active subscription, reduces stock, never duplicates, and skips days without stock
- [ ] Cancelling stops all future orders; only the owner (or an admin) can cancel; cancelling twice is refused
- [ ] Subscriptions past their end date become COMPLETED
- [ ] Docs: scope, requirements (FR/BR), ERD, init.sql, API contract, ADR, READMEs

## Testing
- Backend pytest: create, validation, auth/ownership, cancel, generation (idempotent, stock, cancelled/completed, date range)
- Frontend Node tests for plan/date helpers and validation; typecheck and build
- Browser walkthrough: subscribe → generate → order appears in My orders → cancel
