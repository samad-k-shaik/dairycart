# 02 – Project Scope

## In scope (initial POC)

### Customer application

| # | Capability |
|---|---|
| C1 | View available milk products |
| C2 | View product details |
| C3 | Select product quantity |
| C4 | Add products to cart |
| C5 | Place an order |
| C6 | View order confirmation |
| C7 | View previous orders |

### Admin application

| # | Capability |
|---|---|
| A1 | View dashboard (order counts by status, today's orders) |
| A2 | View all customer orders |
| A3 | View order details |
| A4 | Update order status |
| A5 | View available products |
| A6 | Add, edit and delete products (delete only if never ordered) *(added by #86)* |

## Out of scope

| Excluded | Why it's excluded now | How the architecture leaves room |
|---|---|---|
| OTP authentication | Adds an SMS provider and session security | Customer identified by phone; an `auth` module and `users` table can be added later |
| Payment gateway | External integration, compliance | `orders` can gain a `payment_status` column and a `payments` table |
| Subscription management | Scheduling logic | New `subscriptions` module generating orders |
| Multi-vendor marketplace | Major domain change | Products can gain a `vendor_id` later |
| Delivery partner app | Separate user type and app | New route tree and `deliveries` table |
| Google Maps | External API, cost | Address fields can be added to `customers` |
| WhatsApp notifications | External API | Status changes go through one service function, a natural hook point |
| AI chatbot / Agentic AI | Not needed to prove the POC | API-first design makes it possible to add later |
| Demand forecasting / advanced analytics | Needs historical data | Orders are stored in normalized tables, ready for analysis |

## Simplifying assumptions

1. **Login only for accounts and the admin area (#89).** People can sign up (full name, email, username, password) and log in; the admin area needs an ADMIN account. **Ordering still needs no login:** customers enter name and phone at checkout, and the phone number finds their order history. **This is acceptable only because the POC holds no real data and is not public.** OTP login, password reset and email confirmation remain out of scope.
2. **Single dairy, single city.** The catalogue starts with four seeded products; admins can add, edit and delete products from the admin Products page (A6, added by #86). A product that was already ordered cannot be deleted, only marked unavailable.
3. **Cash on delivery** is assumed. No payments are recorded.
4. **Quantity per line** is 1–20 units.
5. **Currency** is INR, stored as `NUMERIC(10,2)`.

## Success criteria

- A customer can complete the full flow (browse → cart → order → confirmation → history) in the deployed app.
- An admin can move an order from `PLACED` to `DELIVERED`.
- Order totals are always calculated by the backend from database prices.
- CI runs tests on every PR; the app is deployed on Cloud Run.
- Every participant has merged at least one reviewed PR and can explain it.

## Change control

New scope is proposed as a GitHub issue labelled `feature` and discussed before it is added to a milestone. Nothing is added to the current milestone without agreement from the project lead.
