<!-- issue-meta
title: [M11-02] Require login to place orders and show My orders by account
labels: feature
milestone: M11 - User Authentication and Admin Management
-->
# [M11-02] Require login to place orders and show My orders by account

**GitHub issue:** #90 · **Milestone:** M11 - User Authentication and Admin Management

### 1. Objective

Customers must have an account and be logged in to place an order. Each order belongs to the account that placed it, and "My orders" shows the logged-in user's own orders.

### 2. Background

#89 added sign-up, login and roles but kept guest checkout (name + phone, no account), and order history was found by phone number, so anyone who knew a phone number could see that customer's orders, and anyone who guessed an order id could open it. This issue closes both gaps.

### 3. Learning objectives

- Protecting an endpoint for any logged-in user (not only admins)
- Linking rows to the logged-in user with a foreign key and an Alembic migration
- Object-level authorization: "only the owner or an admin may see this order"
- Redirecting to login and back (`?next=`) without losing the cart

### 4. Prerequisites

- #89 (sign-up, login, JWT, USER/ADMIN roles)

### 5. Tasks

**Backend**
- [ ] Migration: `orders.user_id` (nullable FK → `users`, `ON DELETE RESTRICT`, index). Orders placed before this change keep `NULL`.
- [ ] `POST /api/v1/orders` requires a logged-in user (401 otherwise) and saves `user_id`
- [ ] `GET /api/v1/orders/mine`: the logged-in user's orders, newest first
- [ ] `GET /api/v1/orders/{id}`: only the owner or an ADMIN; anyone else gets 404 (no hint that the order exists)
- [ ] Remove `GET /api/v1/orders?phone=` (phone lookup)

**Frontend**
- [ ] Browsing and the cart work without login; **checkout requires login** (`/login?next=/checkout`, cart kept)
- [ ] Checkout keeps name + phone (delivery contact), name pre-filled from the account
- [ ] "My orders" shows the logged-in user's orders (login required)
- [ ] Order details / confirmation work for the owner; others see "not found"

### 6. Technical guidance

Reuse `get_current_user` from #89. Keep the `customers` table (delivery contact by phone, BR-5). Admin endpoints stay ADMIN-only.

### 7. Acceptance criteria

- [ ] A logged-out visitor cannot place an order (UI sends them to login; API returns 401)
- [ ] After login the visitor returns to checkout with the same cart and can order
- [ ] The order is saved with the user's account
- [ ] "My orders" lists only the logged-in user's orders
- [ ] Another user cannot open someone else's order (404); an admin can
- [ ] The phone lookup is gone

### 8. Testing requirements

- API tests: 401 without login, order linked to the user, `/orders/mine` lists only own orders, owner/admin/other-user access to `/orders/{id}`, phone lookup removed
- Migration test still passes (upgrade/downgrade)
- Browser walkthrough of: logged out → checkout → login → order → My orders; second user cannot see it

### 9. Expected deliverables

- Alembic migration, updated order router/service/repository, tests
- Updated checkout, order history and order details pages
- API contract, ERD, requirements and ADR updates

### 10. Definition of Done

- [ ] Acceptance criteria met
- [ ] Tests written and passing (real command output in the PR)
- [ ] Documentation updated
- [ ] PR reviewed and approved
- [ ] Merged into `develop`
