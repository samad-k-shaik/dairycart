<!-- issue-meta
title: [M12-04] Give delivery boys a login and a "Today's deliveries" page
labels: feature, backend, frontend, database, security
milestone: M12 – Future: Maps and Live Delivery Tracking
-->
# [M12-04] Give delivery boys a login and a "Today's deliveries" page

**Milestone:** M12 – Future: Maps and Live Delivery Tracking · **Priority:** High · **Estimated effort:** 8–10 hours

## 1. Objective
Let a delivery boy log in on his phone and see today's orders for his areas (PIN codes). This is the page that will later share his location.

## 2. Background
Since #103, delivery boys are records without a login, and orders are matched to them through the PIN code of the delivery address. To share a location, the server must know **which** delivery boy is sending it, so he needs an account.

## 3. Learning objectives
- Adding a new role and protecting routes by role (authorisation vs authentication)
- Linking an existing table (`delivery_boys`) to `users` with a migration
- Building a mobile-first page

## 4. Prerequisites
- M12-01 approved

## 5. Tasks
- [ ] Add a `DELIVERY_BOY` role to `users`
- [ ] Migration: `delivery_boys.user_id` (nullable, unique, FK to `users`)
- [ ] Admin Delivery Boys page: create or reset a login for a delivery boy (the role is never given by public sign-up)
- [ ] Backend dependency `require_delivery_boy` (like the existing admin check)
- [ ] `GET /api/v1/delivery/me/orders?date=` returns today's orders in his PIN codes, reusing the Orders board matching logic
- [ ] Frontend: `/delivery` route tree with its own mobile layout and a "Today's deliveries" list (customer name, address, phone, items, status)
- [ ] Optional: let him mark an order `OUT_FOR_DELIVERY` / `DELIVERED` through the existing status transition service
- [ ] Update the API contract, ERD and `docs/02-project-scope.md`

## 6. Technical guidance
- Reuse the existing login (#89) and token handling; do not build a second login system.
- A delivery boy must never see orders outside his areas, or any admin endpoint.
- An inactive delivery boy cannot log in.

## 7. Acceptance criteria
- [ ] A delivery boy can log in and sees only his own areas' orders
- [ ] Customers and delivery boys get 403 on each other's and admin endpoints

## 8. Testing requirements
- pytest: role checks (customer, admin, delivery boy, inactive delivery boy), order filtering by PIN code
- Frontend test for the deliveries list (loading, empty, error states)

## 9. Expected deliverables
- Migration, role, endpoints, admin login management, `/delivery` page

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Deliverables committed or linked in the issue
- [ ] Reviewed by another participant / project lead
- [ ] Card moved to **Done**

### Explain during review
- What is the difference between authentication and authorisation in this issue?
