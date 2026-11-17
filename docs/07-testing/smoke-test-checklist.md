# Smoke Test Checklist (M4-09, #54)

A **smoke test** answers one question quickly: *is the deployed app basically working?* It is not a full test (that is CI's job, with 600+ backend and 200+ frontend tests). Run it in about **10 minutes** after every deployment: locally, after `docker compose up --build`, and on Cloud Run (M6). If any step fails, stop and investigate before announcing the release.

## Before you start

| Where | Frontend | API (`API`) | Admin login |
|---|---|---|---|
| Local (`npm run dev` + `uvicorn`) | http://localhost:5173 | http://localhost:8000/api/v1 | the admin you created with `create_admin` |
| Docker Compose | http://localhost:5173 | http://localhost:8000/api/v1 | mobile `9000000001` / `admin_local_only_123` |
| Cloud Run (M6) | the frontend service URL | the backend service URL + `/api/v1` | the production admin (from Secret Manager, never written down) |

You also need: a **customer** account (sign up during the test), and a **delivery boy** with a login whose area (PIN code) matches the customer's address.

Tick each step; write the actual result next to any step that does not match.

## 1. Health (1 min)

| # | Step | Expected result |
|---|---|---|
| 1.1 | Open `API/health` | `{"status":"ok","database":"ok",…}` (HTTP 200) |
| 1.2 | Open the frontend home page | Products are listed with pictures and prices; no error banner |
| 1.3 | Open `API/../docs` (local and Docker only) | The interactive API docs load |

## 2. Customer flow (4 min)

| # | Step | Expected result |
|---|---|---|
| 2.1 | **Sign up** with a new mobile number and a password (8+ characters, a letter and a number), then **log in** with them | Sign-up ends on the login page with "Account created. Please log in."; after logging in you see your account page |
| 2.2 | Account → **Addresses** → add an address; **tap the map** to drop a pin; save | The address appears with "Map pin saved" |
| 2.3 | Home → **+** on a product, then open the cart | The cart shows the product; the quantity can be changed with − / + |
| 2.4 | **Checkout** → "Order once" → **Place order** | The confirmation page shows an order number and "Placed" |
| 2.5 | **My orders** | The new order is at the top |

## 3. Admin flow (3 min)

| # | Step | Expected result |
|---|---|---|
| 3.1 | Log in as the **admin** (another browser or a private window) | The admin dashboard opens with order counts |
| 3.2 | **Orders** board → today's list; then pick the delivery boy in the "All delivery boys" filter | The order's card is there (ids are shown as `#001`); it stays visible when filtered to the delivery boy who covers its PIN code |
| 3.3 | Change its status to **Confirmed** | The status changes; a success message appears |
| 3.4 | **Delivery boys** → the delivery boy shows **Can log in** | (If not: "Give login", set a password) |

## 4. Delivery boy and live tracking (2 min, needs HTTPS or localhost for GPS)

| # | Step | Expected result |
|---|---|---|
| 4.1 | Log in as the **delivery boy** (a phone, or a third browser) | "Today's deliveries" lists the confirmed order |
| 4.2 | **Start round**, allow location | "Sharing your location · sent just now" |
| 4.3 | Admin → **Live map** | His bike appears; the page says "Live" |
| 4.4 | Delivery boy: **Start delivery** on the order | The customer's order page shows **Track your order** with the bike and "about N min away" (needs the address pin from 2.2) |
| 4.5 | Delivery boy: **Mark delivered**, then **Stop round** | The customer's order shows Delivered; the bike disappears from the Live map |

## 5. One error case (30 s)

| # | Step | Expected result |
|---|---|---|
| 5.1 | Log out, then open `/admin` | You are sent to the login page (not shown any admin data) |
| 5.2 | `curl -i API/admin/orders` (no token) | HTTP **401** with `{"error": {"code": "UNAUTHORIZED", …}}` and an `X-Request-ID` header |

## Record of runs

| Date | Where | Commit / version | Result | Notes |
|---|---|---|---|---|
| 2026-11-16 | Local production build (`vite preview` :4173 + `uvicorn` :8010, PostgreSQL 16 in Docker), driven by a headless Chrome script (puppeteer-core) | `feature/54-55-smoke-and-a11y` (on top of #50) | **Pass, 19/19 steps** (output in #54's PR) | 3.3 done through the admin API instead of the status dropdown; 3.2's delivery boy checked through the board's data; 4.x used a simulated GPS position (Chrome geolocation override), no real phone |
