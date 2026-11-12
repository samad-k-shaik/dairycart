# API Contracts – v1

- **Base URL (local):** `http://localhost:8000/api/v1`
- **Format:** JSON, UTF-8. Field names in `snake_case`.
- **Money:** decimal strings with 2 places (e.g. `"60.00"`) so no precision is lost. Frontend formats them as ₹.
- **Dates:** ISO 8601 UTC (e.g. `"2026-11-07T04:30:00Z"`).
- **Auth (#89, #90, ADR-013):** send `Authorization: Bearer <token>` from `POST /auth/login`. Placing and viewing orders needs a logged-in user (#90); every `/admin` endpoint needs an ADMIN. See *Accounts and login* below.
- **Interactive docs:** FastAPI generates OpenAPI at `/docs` and `/openapi.json`. This document is the agreed contract; the OpenAPI output must match it.

> **Key rule:** the backend calculates `unit_price`, `subtotal` and `total_amount` from database prices. Clients send only `product_id` and `quantity`. Any price or total fields sent by a client are rejected (unknown fields → 422).

## Endpoint summary

| Method | Path | Purpose | Success |
|---|---|---|---|
| GET | `/health` | Liveness + DB connectivity | 200 |
| GET | `/products` | List products | 200 |
| GET | `/products/{id}` | Product details | 200 |
| POST | `/orders` | Place an order | 201 |
| GET | `/orders/{id}` | Order details | 200 |
| GET | `/orders/mine` | The logged-in user's orders *(#90)* | 200 |
| GET | `/admin/orders` | All orders (filter, paginate) | 200 |
| PATCH | `/admin/orders/{id}/status` | Update order status | 200 |
| POST | `/admin/products` | Add a product *(#86)* | 201 |
| GET | `/admin/products` | All products **with stock numbers** *(#92)* | 200 |
| PATCH | `/admin/products/{id}` | Edit a product *(#86)* | 200 |
| DELETE | `/admin/products/{id}` | Delete a product that was never ordered *(#86)* | 204 |
| POST | `/auth/register` | Sign up (always `USER`) *(#89)* | 201 |
| POST | `/auth/login` | Log in → token *(#89)* | 200 |
| GET | `/auth/me` | The logged-in user *(#89)* | 200 |
| GET | `/admin/users` | All registered users *(#89)* | 200 |
| POST | `/subscriptions` | Subscribe: 7, 15 or 30 days *(#97)* | 201 |
| GET | `/subscriptions/mine` | The logged-in user's subscriptions *(#97)* | 200 |
| GET | `/subscriptions/{id}` | One subscription (owner or ADMIN) *(#97)* | 200 |
| POST | `/subscriptions/{id}/cancel` | Cancel a subscription *(#97)* | 200 |
| GET | `/admin/subscriptions` | All subscriptions (`?status=`) *(#97)* | 200 |
| POST | `/admin/subscriptions/generate-orders` | Create today's subscription orders *(#97)* | 200 |

All `/admin/…` rows need an **ADMIN** token (401 without one, 403 for a `USER`).

---

## GET /api/v1/health

Checks that the API is running and can reach the database.

**200 OK**
```json
{ "status": "ok", "database": "ok", "version": "0.1.0" }
```

**503 Service Unavailable** (database unreachable)
```json
{ "status": "degraded", "database": "unavailable", "version": "0.1.0" }
```

---

## GET /api/v1/products

| Query param | Type | Default | Description |
|---|---|---|---|
| `include_unavailable` | boolean | `false` | Admin view: include products where `is_available = false` *(proposed, ADR-006)* |

**200 OK**
```json
[
  { "product_id": 1, "name": "Cow Milk", "size": "500 ml", "price": "30.00", "is_available": true, "in_stock": true },
  { "product_id": 2, "name": "Cow Milk", "size": "1 Litre", "price": "60.00", "is_available": true, "in_stock": true },
  { "product_id": 3, "name": "Buffalo Milk", "size": "500 ml", "price": "35.00", "is_available": true, "in_stock": true },
  { "product_id": 4, "name": "Buffalo Milk", "size": "1 Litre", "price": "70.00", "is_available": true, "in_stock": true }
]
```

Returns `[]` (not 404) if there are no products.

---

## GET /api/v1/products/{id}

**200 OK**
```json
{ "product_id": 2, "name": "Cow Milk", "size": "1 Litre", "price": "60.00", "is_available": true, "in_stock": true }
```

| Status | When |
|---|---|
| 404 `NOT_FOUND` | No product with this id |
| 422 `VALIDATION_ERROR` | `id` is not a positive integer |

---

## POST /api/v1/orders

Needs a logged-in user (#90): no token → `401 UNAUTHORIZED`. The order is saved with that account; `customer` (name + phone) is the delivery contact.

**Request**
```json
{
  "customer": { "name": "Ravi Kumar", "phone": "9876543210" },
  "items": [
    { "product_id": 2, "quantity": 2 },
    { "product_id": 3, "quantity": 1 }
  ]
}
```

**Validation**

| Field | Rule |
|---|---|
| `customer.name` | required, trimmed, 2–100 chars |
| `customer.phone` | required, 10-digit Indian mobile, regex `^[6-9]\d{9}$` |
| `items` | required, 1–10 entries |
| `items[].product_id` | required, positive integer, unique within the request |
| `items[].quantity` | required, integer 1–20 |
| unknown fields (e.g. `total_amount`, `price`) | rejected |

**201 Created** – header `Location: /api/v1/orders/101`
```json
{
  "order_id": 101,
  "customer": { "customer_id": 7, "name": "Ravi Kumar", "phone": "9876543210" },
  "order_date": "2026-11-07T04:30:00Z",
  "status": "PLACED",
  "items": [
    { "order_item_id": 501, "product_id": 2, "product_name": "Cow Milk", "size": "1 Litre",
      "quantity": 2, "unit_price": "60.00", "subtotal": "120.00" },
    { "order_item_id": 502, "product_id": 3, "product_name": "Buffalo Milk", "size": "500 ml",
      "quantity": 1, "unit_price": "35.00", "subtotal": "35.00" }
  ],
  "total_amount": "155.00"
}
```

| Status | Code | When |
|---|---|---|
| 400 | `DUPLICATE_PRODUCT` | Same `product_id` appears twice |
| 404 | `NOT_FOUND` | A `product_id` does not exist |
| 409 | `PRODUCT_UNAVAILABLE` | A product has `is_available = false` |
| 409 | `INSUFFICIENT_STOCK` | A quantity is more than the stock *(#92)*. Message: "Only a limited quantity of 'Cow Milk 1 Litre' is left. Please reduce the quantity." (never the number). Detail field: `items[i].quantity` |
| 422 | `VALIDATION_ERROR` | Body fails schema validation |

The whole order is rejected if any item fails. Nothing is saved.

---

## GET /api/v1/orders/{id}

Needs a logged-in user (#90). Only the user who placed the order, or an ADMIN, may see it.

**200 OK** – same shape as the `POST /orders` response.

| Status | When |
|---|---|
| 404 `NOT_FOUND` | No such order, **or it belongs to another user** (same answer, #90) |
| 401 `UNAUTHORIZED` | Not logged in |

---

## GET /api/v1/orders/mine *(#90)*

"My orders": the logged-in user's orders, newest first. Needs a token (401 without one). Returns `[]` when the user has no orders.

*(Replaces `GET /orders?phone=`, removed in #90: anyone who knew a phone number could see that customer's orders. It now answers `405`.)*

**200 OK**
```json
[
  { "order_id": 101, "order_date": "2026-11-07T04:30:00Z", "status": "PLACED", "total_amount": "155.00", "item_count": 2, "subscription_id": null },
  { "order_id": 88,  "order_date": "2026-11-05T03:10:00Z", "status": "DELIVERED", "total_amount": "60.00", "item_count": 1, "subscription_id": 3 }
]
```

`subscription_id` *(#97)*: set when the order was created from a subscription, `null` for a one-time order. The same field is in each `GET /admin/orders` row. Full orders (`POST /orders`, `GET /orders/{id}`, the status PATCH) also carry `subscription_id` and `delivery_date` (`"2026-11-21"`, the day a subscription order is for; `null` for one-time orders).


---

## GET /api/v1/admin/orders

| Query param | Type | Default | Description |
|---|---|---|---|
| `status` | enum | – | Filter by one status |
| `page` | int ≥ 1 | 1 | Page number |
| `page_size` | int 1–100 | 20 | Items per page |

**200 OK**
```json
{
  "items": [
    { "order_id": 101, "customer_name": "Ravi Kumar", "customer_phone": "9876543210",
      "order_date": "2026-11-07T04:30:00Z", "status": "PLACED", "total_amount": "155.00", "item_count": 2 }
  ],
  "page": 1,
  "page_size": 20,
  "total": 1,
  "status_counts": { "PLACED": 1, "CONFIRMED": 0, "OUT_FOR_DELIVERY": 0, "DELIVERED": 0, "CANCELLED": 0 }
}
```

`status_counts` (counts across all orders, ignoring filters) feeds the admin dashboard.

---

## PATCH /api/v1/admin/orders/{id}/status

**Request**
```json
{ "status": "CONFIRMED" }
```

**200 OK** – full order (same shape as `GET /orders/{id}`) with the new status.

| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | No such order |
| 409 | `INVALID_STATUS_TRANSITION` | e.g. `DELIVERED → PLACED` |
| 422 | `VALIDATION_ERROR` | `status` not one of the enum values |

Allowed transitions: see [functional requirements](../03-requirements/functional-requirements.md#order-status-lifecycle).

---

## Admin product management (#86)

Admins can add, edit and delete products (FR-A6). Like every admin endpoint, these need an ADMIN token (#89).

**Field rules** (the same for add and edit; they match the `products` table):

| Field | Rule |
|---|---|
| `name` | 2–100 characters after trimming spaces |
| `size` | 1–20 characters after trimming spaces, e.g. `"500 ml"` |
| `price` | **String** with up to 2 decimals, more than 0, up to `"99999999.99"`. A JSON number (`45.5`) is rejected: money is always a string. |
| `is_available` | `true` / `false`. Optional on add (default `true`). |
| `stock_quantity` | Whole number 0–100000 *(#92)*. Optional on add (default `0`). |

Name + size must be unique, **ignoring upper/lower case** (BR-8) ("cow milk" / "1 litre" counts as the same as "Cow Milk" / "1 Litre"). Unknown fields (e.g. `product_id`) → 422.

### Stock *(#92)*

- Every product has a **stock quantity** (bottles left). **Only admins see the number**: `GET /admin/products` and the admin create/edit responses include `stock_quantity`. Public responses (`GET /products…`) only say `in_stock` (`true` when at least one is left).
- `POST /orders` locks the ordered products, refuses a quantity above the stock with `409 INSUFFICIENT_STOCK` (nothing is saved), and otherwise **reduces** each product's stock in the same transaction.
- Changing an order's status to `CANCELLED` **adds the quantities back**.
- The database refuses negative stock (`ck_products_stock_quantity_non_negative`).

### GET /api/v1/admin/products *(#92)*

ADMIN only. **200 OK**: every product (including unavailable ones), ordered by id, each with `stock_quantity`:
```json
[ { "product_id": 1, "name": "Cow Milk", "size": "500 ml", "price": "30.00", "is_available": true, "in_stock": true, "stock_quantity": 100 } ]
```

### POST /api/v1/admin/products

**Request**
```json
{ "name": "Toned Milk", "size": "500 ml", "price": "28.50", "is_available": true, "stock_quantity": 50 }
```

**201 Created** – the new product, same shape as `GET /products/{id}`:
```json
{ "product_id": 5, "name": "Toned Milk", "size": "500 ml", "price": "28.50", "is_available": true, "in_stock": true, "stock_quantity": 50 }
```

| Status | Code | When |
|---|---|---|
| 409 | `PRODUCT_ALREADY_EXISTS` | Another product has the same name and size |
| 422 | `VALIDATION_ERROR` | A field breaks the rules above, a field is missing, or an unknown field is sent |

### PATCH /api/v1/admin/products/{id}

Send **only the fields that change**; at least one. `null` is not allowed.

**Request**
```json
{ "price": "65.00", "is_available": false }
```

**200 OK** – the updated product (same shape as `GET /products/{id}`).

Changing a price does **not** change orders that were already placed: each order item keeps its own `unit_price` (BR-1).

| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | No such product |
| 409 | `PRODUCT_ALREADY_EXISTS` | The new name + size belongs to another product |
| 422 | `VALIDATION_ERROR` | Empty body `{}`, a `null` value, a field breaks the rules, or the id is not a positive integer |

### DELETE /api/v1/admin/products/{id}

**204 No Content** – the product was deleted (no response body).

Only a product that was **never ordered** can be deleted (BR-7). An ordered product must stay so old orders still show what was bought; the admin marks it unavailable instead (`PATCH` with `{"is_available": false}`), which hides it from customers.

| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | No such product |
| 409 | `PRODUCT_IN_USE` | The product appears in at least one order. Message: "This product has already been ordered, so it cannot be deleted. Mark it unavailable instead." |
| 422 | `VALIDATION_ERROR` | The id is not a positive integer |

---

## Subscriptions (#97)

A subscription delivers the **same items every day** for **1 week (`WEEK`, 7 days)**, **15 days (`HALF_MONTH`)** or **1 month (`MONTH`, 30 days)**. Login required for every endpoint. Each day becomes a normal order (it shows in "My orders" and the admin order list), created by `POST /admin/subscriptions/generate-orders`.

Rules:
- `start_date` must be between **tomorrow and 30 days from today** (India time). `end_date = start_date + days − 1` (the last delivery day, included).
- Prices are **locked** when subscribing: every day's order uses the subscription's `unit_price`, even if the product price changes later.
- **One `ACTIVE` subscription per user** (also a database rule: a partial unique index). Cancel it to start a new one. A plan whose `end_date` has passed becomes `COMPLETED` and no longer counts.
- Statuses: `ACTIVE`, `CANCELLED` (by the owner or an admin), `COMPLETED` (last day passed). Only `ACTIVE` can be cancelled.
- Cancelling stops all **future** orders. An order already created for today stays (an admin can cancel that order, which restores stock).
- Payment stays cash on each delivery; there is no prepayment.

### POST /api/v1/subscriptions

**Request** (`extra` fields such as prices → 422):
```json
{
  "plan": "WEEK",
  "start_date": "2026-11-21",
  "customer": { "name": "Ravi Kumar", "phone": "9876543210" },
  "items": [ { "product_id": 2, "quantity": 1 } ]
}
```
`customer` and `items` follow the same rules as `POST /orders` (1–10 items, quantity 1–20, no duplicates; the products must be available and in stock today).

**201 Created** + `Location: /api/v1/subscriptions/{id}`:
```json
{
  "subscription_id": 3, "plan": "WEEK", "days": 7,
  "start_date": "2026-11-21", "end_date": "2026-11-27", "status": "ACTIVE",
  "customer": { "customer_id": 12, "name": "Ravi Kumar", "phone": "9876543210" },
  "items": [ { "product_id": 2, "product_name": "Cow Milk", "size": "1 Litre", "quantity": 1, "unit_price": "60.00", "subtotal": "60.00" } ],
  "daily_total": "60.00", "plan_total": "420.00", "orders_created": 0,
  "created_at": "2026-11-20T10:15:00Z", "cancelled_at": null
}
```

| Status | Code | When |
|---|---|---|
| 400 | `DUPLICATE_PRODUCT` | Same `product_id` twice |
| 404 | `NOT_FOUND` | A product does not exist |
| 409 | `SUBSCRIPTION_ALREADY_ACTIVE` | The user already has an ACTIVE subscription. Message: "You already have an active subscription. Cancel it before starting a new one." |
| 409 | `PRODUCT_UNAVAILABLE` / `INSUFFICIENT_STOCK` | As for `POST /orders` |
| 422 | `VALIDATION_ERROR` | Bad body, unknown `plan`, or `start_date` out of range (detail `{ "field": "start_date", "issue": "out of range" }`) |

### GET /api/v1/subscriptions/mine

The logged-in user's subscriptions, newest first, each in the shape above (`[]` if none).

### GET /api/v1/subscriptions/{id} and POST /api/v1/subscriptions/{id}/cancel

Owner or ADMIN only; anyone else gets **404** (same answer as a missing id). Cancel returns **200** with the subscription (`status: "CANCELLED"`, `cancelled_at` set), or **409 `SUBSCRIPTION_NOT_ACTIVE`** ("This subscription is already cancelled." / "…completed.").

### GET /api/v1/admin/subscriptions *(ADMIN)*

Optional `?status=ACTIVE|CANCELLED|COMPLETED`. Newest first:
```json
[ { "subscription_id": 3, "username": "ravi", "customer_name": "Ravi Kumar", "customer_phone": "9876543210",
    "plan": "WEEK", "start_date": "2026-11-21", "end_date": "2026-11-27", "status": "ACTIVE",
    "daily_total": "60.00", "orders_created": 2 } ]
```

### POST /api/v1/admin/subscriptions/generate-orders *(ADMIN)*

No body. For **today (India time)**: marks finished plans `COMPLETED`, then creates one order (status `PLACED`, locked prices, stock reduced) for every `ACTIVE` subscription whose dates include today. **Safe to call again**: a subscription never gets two orders for the same day (`uq_orders_subscription_day`). A subscription whose product is unavailable or out of stock is **skipped** for that day and keeps going.

**200 OK**
```json
{
  "delivery_date": "2026-11-21",
  "created": [ { "subscription_id": 3, "order_id": 120 } ],
  "already_created": 0,
  "skipped": [ { "subscription_id": 4, "reason": "Not enough stock of 'Cow Milk 1 Litre'." } ],
  "completed": 1
}
```
The same can be run from the server: `python -m app.scripts.generate_subscription_orders [--date YYYY-MM-DD]`.

---

## Accounts and login (#89)

Tokens are JWTs (HS256) that expire after `JWT_EXPIRE_MINUTES` (default 60). Send them as `Authorization: Bearer <access_token>`. Logout has no endpoint: the client deletes its token.

### POST /api/v1/auth/register

**Request** (no `role`: every new account is `USER`; unknown fields → 422)
```json
{ "full_name": "Ravi Kumar", "email": "ravi@example.com", "username": "ravi_k", "password": "milk1234" }
```

| Field | Rule |
|---|---|
| `full_name` | 2–100 characters after trimming |
| `email` | `something@something.something`, max 254; stored in lower case |
| `username` | 3–30 of letters, digits, `.`, `_`, `-`; stored in lower case |
| `password` | 8+ characters and at most 72 bytes (bcrypt's limit), at least one letter and one number |

**201 Created**
```json
{ "user_id": 7, "full_name": "Ravi Kumar", "email": "ravi@example.com", "username": "ravi_k", "role": "USER", "created_at": "2026-11-10T10:00:00Z" }
```

| Status | Code | When |
|---|---|---|
| 409 | `USER_ALREADY_EXISTS` | Email and/or username already used (any letter case). `details` names the field(s): `email`, `username` |
| 422 | `VALIDATION_ERROR` | A field breaks the rules above, or `role` was sent |

### POST /api/v1/auth/login

**Request** (`login` is the username **or** the email)
```json
{ "login": "ravi_k", "password": "milk1234" }
```

**200 OK**
```json
{ "access_token": "eyJhbGciOiJIUzI1NiIs...", "token_type": "bearer", "expires_in": 3600, "user": { "user_id": 7, "full_name": "Ravi Kumar", "email": "ravi@example.com", "username": "ravi_k", "role": "USER", "created_at": "2026-11-10T10:00:00Z" } }
```

| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | "Invalid username/email or password." The same message for an unknown user and a wrong password |
| 422 | `VALIDATION_ERROR` | `login` or `password` missing |

### GET /api/v1/auth/me

Needs a token. **200 OK**: the user (same shape as the register response). **401 `UNAUTHORIZED`**: no token, or an invalid/expired one.

### GET /api/v1/admin/users

ADMIN only. **200 OK**: every user, oldest first (same shape as above, never password hashes).

### Who may call what

| Endpoints | Access |
|---|---|
| `/health`, `/products…`, `/auth/register`, `/auth/login` | Anyone |
| `POST /orders`, `GET /orders/mine` | Any logged-in user; the order is saved with that account (#90) |
| `GET /orders/{id}` | The user who placed it, or an ADMIN. Anyone else gets `404` (the same as a missing order, so ids cannot be probed) (#90) |
| `/auth/me` | Any logged-in user |
| Every `/admin/…` endpoint (orders, products, users) | **ADMIN only**: no/invalid token → `401 UNAUTHORIZED` (header `WWW-Authenticate: Bearer`); a `USER` token → `403 FORBIDDEN` "Only administrators can do this." |

The role is read from the database on every request, so an admin who is demoted loses access at once. Admins are created only with `python -m app.scripts.create_admin` (see `backend/README.md`).

---

## Error format

Every non-2xx response uses one shape:

```json
{
  "error": {
    "code": "PRODUCT_UNAVAILABLE",
    "message": "Product 'Buffalo Milk 1 Litre' is currently unavailable.",
    "details": [ { "field": "items[1].product_id", "issue": "unavailable" } ],
    "request_id": "8f1c2a7e-4b3d-4a8e-9b2f-1d0c3e5f6a7b"
  }
}
```

Validation example (422):
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": [
      { "field": "customer.phone", "issue": "must be a 10-digit Indian mobile number" },
      { "field": "items[0].quantity", "issue": "must be between 1 and 20" }
    ],
    "request_id": "..."
  }
}
```

Errors that do not come from a specific endpoint use the same shape: an unknown URL returns `404 NOT_FOUND`, a wrong HTTP method returns `405 METHOD_NOT_ALLOWED` (with an `Allow` header), and any unexpected server error returns `500 INTERNAL_ERROR` with a generic message (details only in the logs, never a stack trace). `details` is always a list (empty when there is nothing field-specific). Validation `details` never echo the submitted value.

## Status code reference

| Code | Meaning in this API |
|---|---|
| 200 | Success |
| 201 | Order, product or user created |
| 204 | Deleted (no body) |
| 400 | Request is well-formed but breaks a simple rule (duplicate product) |
| 401 | Not logged in, invalid/expired token, or wrong login details |
| 403 | Logged in, but not allowed (a `USER` on an admin endpoint) |
| 404 | Resource not found |
| 409 | Conflicts with current state (unavailable product, illegal transition, duplicate product name + size, deleting an ordered product, email/username already registered, a second active subscription or cancelling one that is not active (#97)) |
| 422 | Schema validation failed |
| 500 | Unexpected server error (details only in logs) |
| 503 | Dependency (database) unavailable |

## Versioning

Breaking changes require `/api/v2`. Adding optional fields or new endpoints is non-breaking and stays in v1.
