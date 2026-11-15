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
| GET | `/orders/{id}/tracking` | Where is my order? Delivery boy, distance, ETA *(#112)* | 200 |
| GET | `/orders/{id}/tracking/stream` | The same, pushed as Server-Sent Events *(#113)* | 200 |
| GET | `/orders/mine` | The logged-in user's orders *(#90)* | 200 |
| GET | `/admin/orders` | Orders board: filter (status, day, delivery boy, search), paginate *(#104)* | 200 |
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
| PATCH | `/subscriptions/{id}/delivery-slot` | Change the delivery time (owner or ADMIN) *(#100)* | 200 |
| GET | `/delivery-slots` | Active delivery times with places left *(#100)* | 200 |
| GET | `/admin/delivery-slots` | All delivery slots with capacity and bookings *(#100)* | 200 |
| POST | `/admin/delivery-slots` | Add a delivery slot *(#100)* | 201 |
| PATCH | `/admin/delivery-slots/{id}` | Edit a delivery slot *(#100)* | 200 |
| DELETE | `/admin/delivery-slots/{id}` | Delete a slot that was never booked *(#100)* | 204 |
| GET | `/addresses` | My saved addresses (default first) *(#102)* | 200 |
| POST | `/addresses` | Add an address *(#102)* | 201 |
| PATCH | `/addresses/{id}` | Edit an address *(#102)* | 200 |
| POST | `/addresses/{id}/default` | Make it the default *(#102)* | 200 |
| DELETE | `/addresses/{id}` | Delete an address *(#102)* | 204 |
| PATCH | `/subscriptions/{id}/address` | Change a subscription's address (owner) *(#102)* | 200 |
| GET | `/admin/income?from=&to=` | Income overview for a period *(#105)* | 200 |
| GET | `/admin/delivery-boys` | Delivery boys with areas and today's orders *(#103)* | 200 |
| POST | `/admin/delivery-boys` | Add a delivery boy *(#103)* | 201 |
| PATCH | `/admin/delivery-boys/{id}` | Edit a delivery boy *(#103)* | 200 |
| DELETE | `/admin/delivery-boys/{id}` | Delete (frees his areas) *(#103)* | 204 |
| POST | `/admin/delivery-boys/{id}/areas` | Allocate a PIN code *(#103)* | 200 |
| DELETE | `/admin/delivery-boys/{id}/areas/{pincode}` | Remove a PIN code *(#103)* | 200 |
| PUT | `/admin/delivery-boys/{id}/login` | Give a delivery boy a login, or a new password *(#109)* | 200 |
| GET | `/admin/delivery-boys/locations` | Live map: positions, stale flags, today's order pins *(#111)* | 200 |
| GET | `/admin/delivery-boys/locations/stream` | The same, pushed as Server-Sent Events *(#113)* | 200 |
| GET | `/delivery/me` | Logged-in delivery boy: his record and areas *(#109)* | 200 |
| GET | `/delivery/me/orders` | His day's orders (his PIN codes, not cancelled) *(#109)* | 200 |
| PATCH | `/delivery/me/orders/{id}/status` | Mark his order out for delivery / delivered *(#109)* | 200 |
| POST | `/delivery/me/round/start` | Start his round: location sharing on *(#110)* | 200 |
| POST | `/delivery/me/round/stop` | Stop his round; his position is deleted *(#110)* | 200 |
| PUT | `/delivery/me/location` | His latest GPS reading *(#110)* | 204 |
| GET | `/admin/users/{id}` | One user with order count and amount spent *(#101)* | 200 |
| GET | `/admin/users/{id}/orders` | All orders of one user *(#101)* | 200 |

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

*(#102)* `address_id` is one of the user's saved addresses ([Addresses](#addresses-102)); if it is left out, the user's **default** address is used. The backend copies the address text onto the order (`delivery_address` in the response) and its map pin, if any (`delivery_latitude` / `delivery_longitude`, #108; `null` without a pin). A user with no saved address → **422** with detail `{ "field": "address_id", "issue": "required" }`; someone else's or a missing address → **422** `{ "field": "address_id", "issue": "not available" }`.

**Request**
```json
{
  "customer": { "name": "Ravi Kumar", "phone": "9876543210" },
  "address_id": 4,
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

## GET /api/v1/orders/{id}/tracking *(#112)*

Same visibility as `GET /orders/{id}`: the order's **owner** or an ADMIN; anyone else → **404**, without login → **401**. The order page asks every 10 s while the order is out for delivery.
```json
{ "order_id": 41, "status": "OUT_FOR_DELIVERY",
  "delivery_boy": { "name": "Ravi", "position": { "latitude": 17.4465, "longitude": 78.4483 },
                    "updated_at": "2026-11-16T02:41:05Z", "is_stale": false },
  "destination": { "latitude": 17.4375, "longitude": 78.4483 },
  "distance_km": 1.0, "eta_minutes": 3 }
```
- `delivery_boy` is set **only** while the order is `OUT_FOR_DELIVERY` **and** the delivery boy covering its PIN code is on a round with a position (#110); otherwise `null` (privacy, NFR-17). First name only: never his phone number or past positions. `is_stale`: no update for more than 2 minutes.
- `destination`: the order's map pin (#108), or `null`.
- `distance_km`: straight-line (Haversine) distance, 1 decimal; `eta_minutes`: at an average **20 km/h**, rounded up, at least 1. Both `null` unless both points are known. Roads are longer than a straight line, so this is an estimate.

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

The admin Orders board (#104; it replaced the #101 `GET /admin/deliveries`, which was removed).

| Query param | Type | Default | Description |
|---|---|---|---|
| `status` | enum | – | Filter by one status |
| `page` | int ≥ 1 | 1 | Page number |
| `page_size` | int 1–100 | 20 | Items per page |
| `date` | `YYYY-MM-DD` | – (all dates) | *(#104)* An India delivery day: subscription orders **for** that day (`delivery_date`) + one-time orders **placed** that day (`order_date` from 00:00 IST to the next 00:00 IST, i.e. 18:30 UTC the day before) |
| `boy` | id or `unassigned` | – | *(#103/#104)* Orders in a delivery boy's areas (by PIN code, active delivery boys only), or the ones no active delivery boy covers |
| `q` | text ≤ 100 | – | *(#104)* Customer name or phone contains it, or the order number ("42" or "#42"; "#42" matches the number only) |

Newest first. Bad `date`, `boy` (not an id / `unassigned`) or `q` → 422.

**200 OK**
```json
{
  "items": [
    { "order_id": 101, "customer_name": "Ravi Kumar", "customer_phone": "9876543210",
      "order_date": "2026-11-07T04:30:00Z", "status": "PLACED", "total_amount": "155.00", "item_count": 2,
      "subscription_id": 3, "delivery_slot": "Morning, 8:00 AM – 9:00 AM",
      "user_id": 7, "account_name": "Ravi Kumar", "delivery_date": "2026-11-07", "delivery_pincode": "500016",
      "delivery_boy": { "delivery_boy_id": 1, "name": "Kiran", "phone": "9876500001" },
      "items": [ { "product_id": 2, "product_name": "Cow Milk", "size": "1 Litre", "quantity": 2, "unit_price": "60.00", "subtotal": "120.00" } ] }
  ],
  "page": 1,
  "page_size": 20,
  "total": 1,
  "status_counts": { "PLACED": 1, "CONFIRMED": 0, "OUT_FOR_DELIVERY": 0, "DELIVERED": 0, "CANCELLED": 0 },
  "boy_counts": [ { "delivery_boy_id": 1, "name": "Kiran", "orders": 1 } ],
  "unassigned_count": 0
}
```

- `status_counts` follow `date`, `boy` and `q` but **ignore `status`** (so the status chips keep their numbers); without those filters they count **all** orders and feed the admin dashboard.
- *(#104)* `boy_counts` (per active delivery boy) and `unassigned_count` follow `date` and `q`, ignoring `boy` and `status`.
- `delivery_boy` is the ACTIVE delivery boy covering `delivery_pincode` (looked up when read), or `null`. `user_id` / `account_name` (the account holder's full name; `username` before #121) are `null` only for old guest orders (before #90).

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

A subscription delivers the **same items** for **1 week (`WEEK`, 7 days)**, **15 days (`HALF_MONTH`)** or **1 month (`MONTH`, 30 days)**, **every day, every 2nd day or every 3rd day** (`every_n_days` 1, 2 or 3; #99). Login required for every endpoint. Each delivery day becomes a normal order (it shows in "My orders" and the admin order list), created **automatically** by the backend (see below).

Rules:
- `start_date` must be between **tomorrow and 30 days from today** (India time). `end_date = start_date + days − 1` (the last day of the plan, included).
- *(#99)* Delivery days are `start_date + k × every_n_days` up to `end_date`; the plan keeps its calendar length. `deliveries = (days − 1) // every_n_days + 1`, e.g. 1 week every 2 days = days 1, 3, 5, 7 = **4 deliveries**. `plan_total = daily_total × deliveries` (`daily_total` = one delivery).
- Prices are **locked** when subscribing: every day's order uses the subscription's `unit_price`, even if the product price changes later.
- **One `ACTIVE` subscription per user** (also a database rule: a partial unique index). Cancel it to start a new one. A plan whose `end_date` has passed becomes `COMPLETED` and no longer counts.
- Statuses: `ACTIVE`, `CANCELLED` (by the owner or an admin), `COMPLETED` (last day passed). Only `ACTIVE` can be cancelled.
- Cancelling stops all **future** orders. An order already created for today stays (an admin can cancel that order, which restores stock).
- Payment stays cash on each delivery; there is no prepayment.
- *(#100)* Every new subscription books a **delivery time slot** (`delivery_slot_id`, see [Delivery slots](#delivery-slots-100)). The slot must be active and have a place left. Subscriptions from before #100 have `delivery_slot: null`.

### POST /api/v1/subscriptions

**Request** (`extra` fields such as prices → 422):
```json
{
  "plan": "WEEK",
  "start_date": "2026-11-21",
  "every_n_days": 2,
  "delivery_slot_id": 1,
  "customer": { "name": "Ravi Kumar", "phone": "9876543210" },
  "items": [ { "product_id": 2, "quantity": 1 } ]
}
```
`every_n_days` is optional (default `1`); only `1`, `2` or `3` are accepted (otherwise 422). `delivery_slot_id` is **required** *(#100)*. `address_id` works as for `POST /orders` *(#102)*; the subscription keeps the address text (`delivery_address`) and map pin (`delivery_latitude` / `delivery_longitude`, #108), and every delivery order copies them. `customer` and `items` follow the same rules as `POST /orders` (1–10 items, quantity 1–20, no duplicates; the products must be available and in stock today).

**201 Created** + `Location: /api/v1/subscriptions/{id}`:
```json
{
  "subscription_id": 3, "plan": "WEEK", "days": 7, "every_n_days": 2, "deliveries": 4,
  "delivery_slot": { "delivery_slot_id": 1, "name": "Morning", "start_time": "08:00:00", "end_time": "09:00:00",
                     "label": "Morning, 8:00 AM – 9:00 AM", "is_active": true },
  "start_date": "2026-11-21", "end_date": "2026-11-27", "status": "ACTIVE",
  "customer": { "customer_id": 12, "name": "Ravi Kumar", "phone": "9876543210" },
  "items": [ { "product_id": 2, "product_name": "Cow Milk", "size": "1 Litre", "quantity": 1, "unit_price": "60.00", "subtotal": "60.00" } ],
  "daily_total": "60.00", "plan_total": "240.00", "orders_created": 0,
  "created_at": "2026-11-20T10:15:00Z", "cancelled_at": null
}
```

| Status | Code | When |
|---|---|---|
| 400 | `DUPLICATE_PRODUCT` | Same `product_id` twice |
| 404 | `NOT_FOUND` | A product does not exist |
| 409 | `SUBSCRIPTION_ALREADY_ACTIVE` | The user already has an ACTIVE subscription. Message: "You already have an active subscription. Cancel it before starting a new one." |
| 409 | `PRODUCT_UNAVAILABLE` / `INSUFFICIENT_STOCK` | As for `POST /orders` |
| 409 | `DELIVERY_SLOT_FULL` | The chosen slot has no places left *(#100)* |
| 422 | `VALIDATION_ERROR` | Bad body, unknown `plan`, `start_date` out of range (detail `{ "field": "start_date", "issue": "out of range" }`), or the slot does not exist / is switched off (detail `{ "field": "delivery_slot_id", "issue": "not available" }`, #100) |

### GET /api/v1/subscriptions/mine

The logged-in user's subscriptions, newest first, each in the shape above (`[]` if none).

### GET /api/v1/subscriptions/{id} and POST /api/v1/subscriptions/{id}/cancel

Owner or ADMIN only; anyone else gets **404** (same answer as a missing id). Cancel returns **200** with the subscription (`status: "CANCELLED"`, `cancelled_at` set), or **409 `SUBSCRIPTION_NOT_ACTIVE`** ("This subscription is already cancelled." / "…completed.").

### GET /api/v1/admin/subscriptions *(ADMIN)*

Optional `?status=ACTIVE|CANCELLED|COMPLETED` and *(#101)* `?user_id=` (only that user's subscriptions). Newest first:
```json
[ { "subscription_id": 3, "account_name": "Ravi Kumar", "customer_name": "Ravi Kumar", "customer_phone": "9876543210",
    "plan": "WEEK", "every_n_days": 2, "delivery_slot": "Morning, 8:00 AM – 9:00 AM", "start_date": "2026-11-21", "end_date": "2026-11-27", "status": "ACTIVE",
    "daily_total": "60.00", "orders_created": 2 } ]
```

### Delivery orders are created automatically *(#99)*

There is no endpoint for this. The backend creates the orders itself: once when it starts, then every `SUBSCRIPTION_ORDERS_INTERVAL_MINUTES` (default 15). Each run, for **today (India time)**:
- marks finished plans `COMPLETED`;
- creates one order (status `PLACED`, locked prices, stock reduced, `subscription_id`, `delivery_date` and *(#100)* `delivery_slot` set) for every `ACTIVE` subscription that **delivers today**, meaning today is between its dates and `(today − start_date) % every_n_days = 0`.

It is **safe to run again**: a subscription never gets two orders for the same day (`uq_orders_subscription_day`). A subscription whose product is unavailable or out of stock is **skipped** for that day (logged) and keeps going. Manual backup, e.g. to catch up a day the server was off: `python -m app.scripts.generate_subscription_orders [--date YYYY-MM-DD]`.

*(#97 had `POST /admin/subscriptions/generate-orders` and an admin button for this; both were removed in #99.)*

### PATCH /api/v1/subscriptions/{id}/delivery-slot *(#100)*

Change the delivery time of an `ACTIVE` subscription. Owner or ADMIN (anyone else: 404). Body `{ "delivery_slot_id": 2 }`. Returns **200** with the subscription. Orders already created keep their time; the next ones use the new slot. Choosing the slot it already has is accepted (even when that slot is full).

| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | No such subscription, or someone else's |
| 409 | `SUBSCRIPTION_NOT_ACTIVE` | Cancelled or completed |
| 409 | `DELIVERY_SLOT_FULL` | The new slot has no places left |
| 422 | `VALIDATION_ERROR` | The slot does not exist or is switched off (`delivery_slot_id`: "not available") |

### PATCH /api/v1/subscriptions/{id}/address *(#102)*

Owner only (anyone else, admins included: 404, since only the owner's saved addresses can be chosen). Body `{ "address_id": 5 }`. **200** with the subscription and its new `delivery_address` and map pin (#108); orders already created keep theirs. **409 `SUBSCRIPTION_NOT_ACTIVE`** for a cancelled or completed plan; **422** on `address_id` for an address that is not yours.

---

## Addresses (#102)

The logged-in user's saved delivery addresses. Login required; another user's address id answers **404** like a missing one.

Rules:
- Up to **10** per user (**409 `ADDRESS_LIMIT_REACHED`**).
- The first address becomes the default; exactly one default while the user has addresses (also a database rule: a partial unique index). `is_default: true` on create, or `POST /addresses/{id}/default`, moves the default. Deleting the default makes the oldest remaining address the default.
- Fields: `label` 2–30, `house` 1–100, `street` 2–150, `landmark` optional ≤ 100 (`null` or `""` removes it), `city` 2–50, `pincode` 6 digits not starting with 0. Text is trimmed.
- Orders and subscriptions keep a **text copy** (`full_text`), so editing or deleting an address never changes them.
- **Map pin (optional, #108):** `latitude` (−90…90) and `longitude` (−180…180) in degrees, sent **together** (one without the other → 422). Stored with 6 decimals (about 11 cm); more decimals are rounded. Returned as JSON numbers, or both `null` when there is no pin. Orders and subscriptions copy the pin as `delivery_latitude` / `delivery_longitude`, like the address text.

### GET /api/v1/addresses

Default first, then oldest first:
```json
[ { "address_id": 4, "label": "Home", "house": "12-3 Sai Residency", "street": "MG Road, Ameerpet",
    "landmark": null, "city": "Hyderabad", "pincode": "500016", "latitude": 17.4375, "longitude": 78.4483, "is_default": true,
    "full_text": "12-3 Sai Residency, MG Road, Ameerpet, Hyderabad - 500016", "created_at": "2026-11-13T09:00:00Z" } ]
```

### POST /api/v1/addresses → 201 · PATCH /api/v1/addresses/{id} → 200

```json
{ "label": "Office", "house": "Plot 5, Cyber Towers", "street": "Hitech City", "landmark": "Opposite metro",
  "city": "Hyderabad", "pincode": "500081", "latitude": 17.4474, "longitude": 78.3762, "is_default": false }
```
`label` defaults to `"Home"`, `is_default` to `false`; `latitude`/`longitude` are optional (#108). PATCH: only the fields that change (at least one; not `is_default`). The pin changes as a pair: both numbers move it, both `null` remove it.

### POST /api/v1/addresses/{id}/default → 200 · DELETE /api/v1/addresses/{id} → 204

---

## Delivery slots (#100)

A delivery slot is a daily time window (India time) in which subscription orders are delivered, e.g. **Morning 08:00–09:00**. The admin manages the slots; every subscription books one.

Rules:
- **Capacity** = how many `ACTIVE` subscriptions can book the slot (1–1000). Cancelled and completed plans free their place. Booking locks the slot row (`SELECT … FOR UPDATE`), so two people can never take the last place at the same time.
- Lowering the capacity never removes a booking; the slot just shows full (`spaces_left` never goes below 0).
- A switched-off slot (`is_active: false`) is hidden from customers; subscriptions that booked it keep it.
- A slot that was ever booked cannot be deleted (switch it off instead). The **last active slot** can neither be switched off nor deleted, so customers always have a time to choose.
- The migration creates two standard slots, editable like any other: **Morning 08:00–09:00** and **Evening 17:00–18:00**, capacity 50 each.
- Times are sent as `"HH:MM"` (hours and minutes only) and returned as `"HH:MM:SS"`. `end_time` must be after `start_time`; two slots cannot have exactly the same times.
- Each subscription order stores a **text copy** of its slot in `delivery_slot` (e.g. `"Morning, 8:00 AM – 9:00 AM"`), so editing a slot later does not change orders already created. One-time orders have `delivery_slot: null`. `GET /orders/{id}`, `GET /orders/mine` and `GET /admin/orders` include it.

### GET /api/v1/delivery-slots

Public (no login), like the product list. Active slots, earliest first; full slots are listed with `is_full: true`.
```json
[ { "delivery_slot_id": 1, "name": "Morning", "start_time": "08:00:00", "end_time": "09:00:00",
    "label": "Morning, 8:00 AM – 9:00 AM", "spaces_left": 48, "is_full": false } ]
```

### GET /api/v1/admin/delivery-slots *(ADMIN)*

All slots (switched-off ones too), each as above plus `"capacity": 50, "booked": 2, "is_active": true`.

### POST /api/v1/admin/delivery-slots *(ADMIN)*

```json
{ "name": "Late morning", "start_time": "10:00", "end_time": "11:00", "capacity": 20, "is_active": true }
```
`is_active` is optional (default `true`). Name 2–50 characters. **201** with the admin shape.

### PATCH /api/v1/admin/delivery-slots/{id} *(ADMIN)*

Send only the fields that change (at least one, no `null`). **200** with the admin shape.

### DELETE /api/v1/admin/delivery-slots/{id} *(ADMIN)*

**204** when the slot was never booked.

| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | No slot with this id |
| 409 | `DELIVERY_SLOT_ALREADY_EXISTS` | Another slot has the same start and end time |
| 409 | `DELIVERY_SLOT_IN_USE` | Delete: the slot was booked by a subscription |
| 409 | `LAST_ACTIVE_DELIVERY_SLOT` | Switching off or deleting the only active slot |
| 422 | `VALIDATION_ERROR` | Bad name, time or capacity, or end not after start |

---

## Income (#105) *(ADMIN)*

### GET /api/v1/admin/income?from=YYYY-MM-DD&to=YYYY-MM-DD

Income overview for a period of India days (both included). Default: this month so far. `to` before `from`, more than 366 days, or a badly formatted date → **422**.

Rules:
- **Income = DELIVERED orders** (cash on delivery). Placed / confirmed / out-for-delivery orders are `pending`; cancelled orders count nowhere.
- An order counts on its **delivery day**: subscription orders on `delivery_date`, one-time orders on the India day they were placed (the Orders board rule, #104).
- Every `*_change` / `growth` is the percent change vs the **previous period of the same length** right before it (`previous_start`–`previous_end`), rounded to 1 decimal; `null` when the previous period had nothing.
- `litres` count only milk products, from their size text ("500 ml" = 0.5, "1 Litre" = 1); other products have `litres: null`.
- Not available (no data in the app): delivery charges, expenses, profit, payment status.

```json
{
  "start": "2026-11-01", "end": "2026-11-15", "previous_start": "2026-10-17", "previous_end": "2026-10-31", "days": 15,
  "summary": { "litres": 22.5, "litres_change": 12.5, "income": "3035.00", "income_change": 8.5,
               "avg_daily_income": "202.33", "avg_daily_change": 8.5, "delivered_orders": 22, "delivered_orders_change": 4.8,
               "pending_income": "3645.00", "pending_orders": 36 },
  "daily": [ { "date": "2026-11-01", "income": "0.00", "orders": 0 } ],
  "monthly": [ { "month": "2026-11", "income": "3035.00", "orders": 22 } ],
  "by_type": [ { "type": "SUBSCRIPTION", "income": "1110.00", "orders": 12, "share": 36.6 },
               { "type": "ONE_TIME", "income": "1925.00", "orders": 10, "share": 63.4 } ],
  "by_product": [ { "product_id": 2, "name": "Cow Milk", "size": "1 Litre", "quantity": 11, "litres": 11.0, "income": "660.00", "share": 21.7 } ],
  "by_area": [ { "pincode": "100001", "area_name": "Gachibowli", "litres": 1.0, "income": "290.00", "orders": 2, "customers": 2, "growth": null } ],
  "subscriptions": { "active": 13, "income": "1110.00", "income_change": null },
  "recent": [ { "order_id": 60, "date": "2026-11-15", "customer_name": "Amer", "type": "SUBSCRIPTION", "amount": "65.00" } ],
  "insights": [ "Subscriptions bring 36.6% of the income." ]
}
```
`daily` has every day of the period (0 when nothing was delivered); `monthly` the 6 months up to `end`; `by_product` and `by_area` are sorted by income (an area `pincode: null` = orders without an address, before #102; `area_name` comes from a delivery boy area, #103); `recent` has the latest 8 delivered orders.

## Delivery boys (#103) *(ADMIN)*

The admin's list of delivery boys and their areas. Since #109 a delivery boy can get a **login** (see [Delivery boy app](#delivery-boy-app-109)).

- Delivery boy: `name` 2–100, `phone` 10-digit Indian mobile number (unique → **409 `DELIVERY_BOY_ALREADY_EXISTS`**), `is_active` (default `true`).
- Area: `pincode` (6 digits, not starting with 0) + optional `area_name` ≤ 50. **One delivery boy per PIN code**: allocating a PIN code someone has → **409 `AREA_ALREADY_ALLOCATED`** ("500016 is already allocated to Ravi Kumar. Remove it there first.").
- Inactive delivery boys keep their areas, but their orders are "not assigned". Deleting one frees his areas (orders are not linked to delivery boys).

```json
{ "delivery_boy_id": 1, "name": "Ravi Kumar", "phone": "9876500001", "is_active": true,
  "areas": [ { "pincode": "500016", "area_name": "Ameerpet" } ],
  "created_at": "2026-11-14T10:00:00Z", "today_orders": 3, "has_login": true }
```
`today_orders`: today's orders (India time, not cancelled) in his areas. `GET` lists active first, then by name. `POST /admin/delivery-boys/{id}/areas` takes `{ "pincode": "500016", "area_name": "Ameerpet" }` and returns the delivery boy; `DELETE …/areas/{pincode}` returns him too (404 if it is not his area). `PATCH`: only the fields that change; if he has a login, its mobile number and name follow (another account already using the new number → **409 `USER_ALREADY_EXISTS`**). Deleting a delivery boy also deletes his login.

### PUT /api/v1/admin/delivery-boys/{id}/login *(#109)*

Body `{ "password": "deliver123" }` (same rules as sign-up: 8+ characters, a letter and a number → otherwise **422**). Creates his account (his `phone` and `name`, role `DELIVERY_BOY`), or sets a new password if he has one. **200** with the delivery boy (`has_login: true`); the password is never returned. **409 `USER_ALREADY_EXISTS`** if another account (e.g. a customer) already uses his mobile number: an existing account is never taken over. **404** for an unknown id.

### GET /api/v1/admin/delivery-boys/locations *(#111)*

The admin live map (asked every 10 s by the page). Every **active** delivery boy, those on a round first, then by name:
```json
[ { "delivery_boy_id": 1, "name": "Ravi Kumar", "phone": "9876500001",
    "on_round": true, "round_started_at": "2026-11-16T02:30:00Z",
    "position": { "latitude": 17.4375, "longitude": 78.4483, "accuracy_m": 12,
                  "updated_at": "2026-11-16T02:41:05Z", "is_stale": false },
    "orders": [ { "order_id": 41, "status": "CONFIRMED", "customer_name": "Asha",
                  "latitude": 17.4401, "longitude": 78.4512 } ] } ]
```
- `position`: his latest reading (#110) while on a round, else `null` (also `null` on a round before the first reading). `is_stale`: no update for more than **2 minutes** (screen locked, no signal…).
- `orders`: his orders for today (same day rule as the Orders board, matched by PIN code) that are **not delivered or cancelled** and have a **map pin** (#108).
- A fixed number of queries however many delivery boys there are.

---

## Delivery boy app (#109)

For a logged-in **DELIVERY_BOY** whose delivery boy record is **active**: **401** without a login, **403 `FORBIDDEN`** for customers, admins and switched-off delivery boys (checked on every request, so switching him off ends his access at once).

### GET /api/v1/delivery/me

```json
{ "delivery_boy_id": 1, "name": "Ravi Kumar", "phone": "9876500001",
  "areas": [ { "pincode": "500016", "area_name": "Ameerpet" } ],
  "on_round": true, "round_started_at": "2026-11-16T02:30:00Z" }
```
`on_round` / `round_started_at` *(#110)*: whether he is sharing his location now.

### GET /api/v1/delivery/me/orders?date=YYYY-MM-DD

The orders to deliver that day (default: today, India time; same day rule as the admin Orders board) whose `delivery_pincode` is one of **his** areas, **not cancelled**, sorted by slot time (one-time orders last), then order id. Only what he needs at the door: no item prices.
```json
[ { "order_id": 41, "status": "CONFIRMED", "delivery_date": "2026-11-16", "delivery_slot": "Morning, 8:00 AM – 9:00 AM",
    "customer_name": "Ravi Kumar", "customer_phone": "9876543210",
    "delivery_address": "12-3 Sai Residency, MG Road, Ameerpet, Hyderabad - 500016", "delivery_pincode": "500016",
    "delivery_latitude": 17.4375, "delivery_longitude": 78.4483, "total_amount": "120.00",
    "items": [ { "product_name": "Cow Milk", "size": "1L", "quantity": 2 } ] } ]
```
An invalid `date` → **422**.

### PATCH /api/v1/delivery/me/orders/{id}/status

Body `{ "status": "OUT_FOR_DELIVERY" }` or `{ "status": "DELIVERED" }`; any other status → **422** (confirming and cancelling stay with the admin). The normal transition rules apply: `CONFIRMED → OUT_FOR_DELIVERY → DELIVERED`, otherwise **409 `INVALID_STATUS_TRANSITION`**. An order outside his areas → **404** (like a missing one). **200** with the order in the shape above.

### Live location (#110)

Privacy (NFR-17): a position is accepted **only during a round**, the round's start screen tells him what is shared, stopping the round (or logging out) **deletes** his position, there is **no history**, and coordinates are never logged.

- `POST /delivery/me/round/start` → **200** `{ "on_round": true, "round_started_at": "2026-11-16T02:30:00Z" }` (pressing it again keeps the first time).
- `POST /delivery/me/round/stop` → **200** `{ "on_round": false, "round_started_at": null }`; his saved position is deleted.
- `PUT /delivery/me/location` with
  ```json
  { "latitude": 17.4375, "longitude": 78.4483, "accuracy_m": 12, "recorded_at": "2026-11-16T02:31:10Z" }
  ```
  → **204**. `accuracy_m` is optional (0–10 000). `recorded_at` must include a time zone. Only the **latest** position is kept (one row, updated in place); a reading **older** than the saved one is ignored (still 204), and a `recorded_at` in the future is treated as now. Not on a round → **409 `ROUND_NOT_STARTED`**; out-of-range values, a time without a zone or unknown fields → **422**.

The phone sends a reading every 10 s, or after moving 20 m, never more than every 5 s, and skips readings less precise than 100 m.

### GET /api/v1/admin/users/{id} *(ADMIN)*

The user (same fields as `GET /admin/users`, never the password hash) plus `"order_count": 12` and `"total_spent": "1440.00"` (the sum of the user's orders that are **not cancelled**). **404 `NOT_FOUND`** for an unknown id.

### GET /api/v1/admin/users/{id}/orders *(ADMIN)*

All of that user's orders, newest first, in the same shape as `GET /orders/mine`. **404 `NOT_FOUND`** for an unknown id (an existing user without orders → `[]`).

---

## Accounts and login (#89; mobile number login since #121)

Tokens are JWTs (HS256) that expire after `JWT_EXPIRE_MINUTES` (default 60). Send them as `Authorization: Bearer <access_token>`. Logout has no endpoint: the client deletes its token.

### POST /api/v1/auth/register

**Request** (no `role`: every new account is `USER`; unknown fields → 422)
```json
{ "full_name": "Ravi Kumar", "phone": "9876543210", "password": "milk1234" }
```

| Field | Rule |
|---|---|
| `full_name` | 2–100 characters after trimming |
| `phone` | The login (#121). 10-digit Indian mobile number starting with 6–9. Spaces, dashes and a `+91` or leading `0` are removed first, so `"+91 98765 43210"` is saved as `"9876543210"` |
| `password` | 8+ characters and at most 72 bytes (bcrypt's limit), at least one letter and one number |

**201 Created**
```json
{ "user_id": 7, "full_name": "Ravi Kumar", "phone": "9876543210", "role": "USER", "created_at": "2026-11-10T10:00:00Z" }
```

| Status | Code | When |
|---|---|---|
| 409 | `USER_ALREADY_EXISTS` | The mobile number already has an account. `details`: `[{ "field": "phone", "issue": "already registered" }]` |
| 422 | `VALIDATION_ERROR` | A field breaks the rules above, or an unknown field (`role`, and since #121 `email` / `username`) was sent |

### POST /api/v1/auth/login

**Request** (#121: the mobile number used at sign-up, normalised like at sign-up)
```json
{ "phone": "9876543210", "password": "milk1234" }
```

**200 OK**
```json
{ "access_token": "eyJhbGciOiJIUzI1NiIs...", "token_type": "bearer", "expires_in": 3600, "user": { "user_id": 7, "full_name": "Ravi Kumar", "phone": "9876543210", "role": "USER", "created_at": "2026-11-10T10:00:00Z" } }
```
`role` is `USER`, `ADMIN` or `DELIVERY_BOY` (#109); the frontend opens `/account`, `/admin` or `/delivery` accordingly.

| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | "Invalid mobile number or password." The same message for a number without an account and a wrong password |
| 403 | `FORBIDDEN` | *(#109)* Right password, but a delivery boy the admin switched off: "Your delivery account is switched off. Please contact the dairy." |
| 422 | `VALIDATION_ERROR` | `phone` or `password` missing, or `phone` is not a valid mobile number |

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

## Live streams (Server-Sent Events, #113)

`GET /admin/delivery-boys/locations/stream` (ADMIN) and `GET /orders/{id}/tracking/stream` (order owner or ADMIN) send the **same JSON** as their non-stream endpoints, as Server-Sent Events (`Content-Type: text/event-stream`, `Cache-Control: no-cache`):
```text
retry: 3000

event: snapshot
data: {"order_id": 41, "status": "OUT_FOR_DELIVERY", ...}

: ping

```
- A `snapshot` at once, then again **whenever the data changes** (a location saved, a round started or stopped, an order status changed: PostgreSQL `NOTIFY`, ADR-020), otherwise a `: ping` comment every 15 s.
- Access is checked **before** streaming (401 / 403 / 404 as for the normal endpoints) and again for every snapshot; losing access ends the stream.
- A stream ends after **25 minutes**; clients reconnect (the frontend waits 1, 2, 5, then 10 s after failures and **falls back to polling** the normal endpoint every 10 s while the stream is down).
- Send the token as `Authorization: Bearer …` (the browser's `EventSource` cannot, so the frontend reads the stream with `fetch`).

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
| 204 | Deleted, or a location saved (#110) (no body) |
| 400 | Request is well-formed but breaks a simple rule (duplicate product) |
| 401 | Not logged in, invalid/expired token, or wrong login details |
| 403 | Logged in, but not allowed (a `USER` on an admin endpoint) |
| 404 | Resource not found |
| 409 | Conflicts with current state (unavailable product, illegal transition, duplicate product name + size, deleting an ordered product, mobile number already registered (#121), a second active subscription or cancelling one that is not active (#97), a full delivery slot, deleting a booked slot or switching off the last active one (#100), more than 10 saved addresses (#102), a delivery boy phone or PIN code already taken (#103), another account already using a delivery boy's number (#109), a location sent outside a round (#110)) |
| 422 | Schema validation failed |
| 500 | Unexpected server error (details only in logs) |
| 503 | Dependency (database) unavailable |

## Versioning

Breaking changes require `/api/v2`. Adding optional fields or new endpoints is non-breaking and stays in v1.
