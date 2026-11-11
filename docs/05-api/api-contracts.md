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
| PATCH | `/admin/products/{id}` | Edit a product *(#86)* | 200 |
| DELETE | `/admin/products/{id}` | Delete a product that was never ordered *(#86)* | 204 |
| POST | `/auth/register` | Sign up (always `USER`) *(#89)* | 201 |
| POST | `/auth/login` | Log in → token *(#89)* | 200 |
| GET | `/auth/me` | The logged-in user *(#89)* | 200 |
| GET | `/admin/users` | All registered users *(#89)* | 200 |

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
  { "product_id": 1, "name": "Cow Milk", "size": "500 ml", "price": "30.00", "is_available": true },
  { "product_id": 2, "name": "Cow Milk", "size": "1 Litre", "price": "60.00", "is_available": true },
  { "product_id": 3, "name": "Buffalo Milk", "size": "500 ml", "price": "35.00", "is_available": true },
  { "product_id": 4, "name": "Buffalo Milk", "size": "1 Litre", "price": "70.00", "is_available": true }
]
```

Returns `[]` (not 404) if there are no products.

---

## GET /api/v1/products/{id}

**200 OK**
```json
{ "product_id": 2, "name": "Cow Milk", "size": "1 Litre", "price": "60.00", "is_available": true }
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
  { "order_id": 101, "order_date": "2026-11-07T04:30:00Z", "status": "PLACED", "total_amount": "155.00", "item_count": 2 },
  { "order_id": 88,  "order_date": "2026-11-05T03:10:00Z", "status": "DELIVERED", "total_amount": "60.00", "item_count": 1 }
]
```


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

Name + size must be unique, **ignoring upper/lower case** (BR-8) ("cow milk" / "1 litre" counts as the same as "Cow Milk" / "1 Litre"). Unknown fields (e.g. `product_id`) → 422.

### POST /api/v1/admin/products

**Request**
```json
{ "name": "Toned Milk", "size": "500 ml", "price": "28.50", "is_available": true }
```

**201 Created** – the new product, same shape as `GET /products/{id}`:
```json
{ "product_id": 5, "name": "Toned Milk", "size": "500 ml", "price": "28.50", "is_available": true }
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
| 409 | Conflicts with current state (unavailable product, illegal transition, duplicate product name + size, deleting an ordered product, email/username already registered) |
| 422 | Schema validation failed |
| 500 | Unexpected server error (details only in logs) |
| 503 | Dependency (database) unavailable |

## Versioning

Breaking changes require `/api/v2`. Adding optional fields or new endpoints is non-breaking and stays in v1.
