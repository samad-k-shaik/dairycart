<!-- issue-meta
title: Admin: Income tab (income overview with charts)
labels: 
milestone: M8 – Ordering, Subscriptions and Delivery Operations
-->
# Admin: Income tab (income overview with charts)

**GitHub issue:** #105 · **Milestone:** M8 – Ordering, Subscriptions and Delivery Operations

## Objective

An admin **Income** tab: business income overview for a chosen period, from the data the app already has. Approved scope change ("advanced analytics" was out of scope; a basic income report is now in scope).

## Scope

- Period: Today, This week, This month (default), This year, or a custom range (India days, max 1 year). Every figure is compared with the previous period of the same length.
- Cards: milk sold (litres, from product sizes such as "500 ml" / "1 Litre"), income, average daily income, delivered orders, pending amount (placed / confirmed / out for delivery).
- Charts (Recharts): daily income trend, monthly income (last 6 months), income by order type (subscription vs one-time), product breakdown.
- Tables: delivery area performance (by PIN code, with locality name when known; litres, income, customers, growth), subscription overview (active subscriptions, subscription income), recent delivered orders.
- Key insights generated from the numbers.

**Income = DELIVERED orders only** (cash on delivery). An order counts on its delivery day: subscription orders on `delivery_date`, one-time orders on the India day they were placed.

## Not included (no data in the app)
Delivery charges, expenses, net profit, payment ("Paid") status.

## API
`GET /api/v1/admin/income?from=YYYY-MM-DD&to=YYYY-MM-DD` (ADMIN only). No database change.

## Acceptance criteria
- [ ] Income tab in the admin sidebar (linked from the Dashboard on phones)
- [ ] Endpoint with grouped queries (no N+1); 422 for bad or too-long periods
- [ ] Recharts added at an exact version, with ADR-016
- [ ] pytest; frontend helper tests; typecheck/build; browser check at 360px and desktop
- [ ] Docs: API contract, requirements, scope (+ AGENTS.md out-of-scope note), ADR, READMEs
