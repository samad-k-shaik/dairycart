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
| C9 | Save delivery addresses (Account → Addresses; one default) and choose one for every order and subscription *(added by #102, approved scope change)* |
| C8 | Choose "order once" or a subscription (1 week / 15 days / 1 month; every day, every 2 or every 3 days) in a chosen delivery time slot, change the time, and cancel it *(added by #97, #99 and #100, approved scope change)* |

### Admin application

| # | Capability |
|---|---|
| A1 | View dashboard (order counts by status, today's orders) |
| A2 | View all customer orders |
| A3 | View order details |
| A4 | Update order status |
| A5 | View available products |
| A6 | Add, edit and delete products (delete only if never ordered) *(added by #86)* |
| A7 | View subscriptions; their delivery orders are created automatically *(added by #97, #99)* |
| A8 | Manage delivery time slots: add, edit, set capacity, switch off, delete *(added by #100)* |
| A9 | Daily deliveries per user with status, and each user's full order list *(added by #101; the daily view is the Orders board since #104)* |
| A11 | Income tab: income from delivered orders for a chosen period, with charts and comparisons to the previous period *(added by #105, approved scope change; no expenses or profit)* |
| A10 | Keep a list of delivery boys and allocate areas (PIN codes) to them; deliveries are split per delivery boy *(added by #103; delivery boys do not log in, so the delivery partner app stays out of scope)* |

### Planned: maps and live delivery tracking (M12, approved by #106)

Not built yet. Built only with free, open-source tools (ADR-018). Privacy rules: NFR-17.

| # | Capability | Issue |
|---|---|---|
| C10 | Drop a map pin on a saved address; orders and subscriptions keep a copy of it | #108 |
| C11 | Track an order that is out for delivery on a map, with distance and estimated arrival time *(built: #112)* | #112 |
| D1 | Delivery boys log in on a phone web page and see today's deliveries for their areas; they mark orders out for delivery / delivered *(built: #109)* | #109 |
| D2 | Delivery boys share their location only while a delivery round is started *(built: #110)* | #110 |
| A12 | Admin live map of delivery boys on a round *(built: #111, Admin → Live map)* | #111 |

## Out of scope

| Excluded | Why it's excluded now | How the architecture leaves room |
|---|---|---|
| OTP authentication | Adds an SMS provider and session security | Customer identified by phone; an `auth` module and `users` table can be added later |
| Payment gateway | External integration, compliance | `orders` can gain a `payment_status` column and a `payments` table |
| Pausing/skipping single days, choosing weekdays, editing a running subscription, prepaid plans *(basic subscriptions moved in scope by #97/#99)* | More rules and payments | The same `subscriptions` module and `generate_orders_for(day)` service can be extended |
| Multi-vendor marketplace | Major domain change | Products can gain a `vendor_id` later |
| Native delivery partner app (Android / iOS) | A separate app to build, publish and maintain | A delivery boy **web page** with login is planned in M12 (#106, #109); it uses the same backend |
| Google Maps (and other paid map APIs) | External API, cost, billing account | Free, open-source maps (Leaflet + OpenStreetMap) and live tracking are planned instead in M12 (#106, ADR-018). Exception: a plain Google Maps **directions link** (no API, key or billing) for the delivery boy's "Navigate" button (#134, ADR-021) |
| WhatsApp notifications | External API | Status changes go through one service function, a natural hook point |
| AI chatbot / Agentic AI | Not needed to prove the POC | API-first design makes it possible to add later |
| Demand forecasting / advanced analytics *(a basic income report is in scope since #105)* | Needs historical data | Orders are stored in normalized tables, ready for analysis |

## Simplifying assumptions

1. **Login only for accounts and the admin area (#89).** People can sign up (full name, mobile number, password; #121) and log in with their mobile number and password; the admin area needs an ADMIN account. **Ordering needs an account too (#90):** the cart works without login, but checkout, "My orders" and order details need a logged-in user. Name and phone at checkout are the delivery contact. **This is acceptable only because the POC holds no real data and is not public.** OTP login (the planned way to log in for a real launch, ADR-019) and password reset remain out of scope.
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
