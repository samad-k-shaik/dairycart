<!-- issue-meta
title: Customer pages: remove the footer Admin link
labels: 
milestone: M8 – Ordering, Subscriptions and Delivery Operations
-->
# Customer pages: remove the footer Admin link

**GitHub issue:** #96 · **Milestone:** M8 – Ordering, Subscriptions and Delivery Operations

## Objective
Customers should not see an "Admin" link in the shop footer (bottom right of every customer page).

## Scope
- Remove the footer "Admin" link from `CustomerLayout`.
- Admins still reach the dashboard: after logging in they land on `/admin`, and the Account page shows "Open the Admin Dashboard" to admins only.
- `/admin` itself stays protected (ADMIN only, #89).

## Acceptance criteria
- [ ] No "Admin" link on customer pages (logged out, or logged in as a user)
- [ ] An admin can still open the dashboard via login or the Account page
- [ ] Admin pages unchanged

## Testing
- `npm run typecheck`, `npm run build`, `npm test`
- Browser check: footer has no link to /admin; admin login lands on /admin
