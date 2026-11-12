# Database ERD

## Diagram

```mermaid
erDiagram
    CUSTOMERS ||--o{ ORDERS : places
    USERS |o--o{ ORDERS : "placed by"
    ORDERS ||--|{ ORDER_ITEMS : contains
    PRODUCTS ||--o{ ORDER_ITEMS : "appears in"
    USERS ||--o{ SUBSCRIPTIONS : "subscribes"
    CUSTOMERS ||--o{ SUBSCRIPTIONS : "delivered to"
    SUBSCRIPTIONS ||--|{ SUBSCRIPTION_ITEMS : contains
    PRODUCTS ||--o{ SUBSCRIPTION_ITEMS : "appears in"
    SUBSCRIPTIONS |o--o{ ORDERS : "creates daily"

    CUSTOMERS {
        int customer_id PK
        varchar name
        varchar phone UK
        timestamptz created_at
    }
    PRODUCTS {
        int product_id PK
        varchar name
        varchar size
        numeric price
        boolean is_available
        int stock_quantity
        timestamptz created_at
    }
    ORDERS {
        int order_id PK
        int customer_id FK
        int user_id FK
        int subscription_id FK
        date delivery_date
        timestamptz order_date
        numeric total_amount
        varchar status
    }
    ORDER_ITEMS {
        int order_item_id PK
        int order_id FK
        int product_id FK
        int quantity
        numeric unit_price
        numeric subtotal
    }
    USERS {
        int user_id PK
        varchar full_name
        varchar email UK
        varchar username UK
        varchar password_hash
        varchar role
        timestamptz created_at
    }
    SUBSCRIPTIONS {
        int subscription_id PK
        int user_id FK
        int customer_id FK
        varchar plan
        date start_date
        date end_date
        varchar status
        numeric daily_total
        timestamptz created_at
        timestamptz cancelled_at
    }
    SUBSCRIPTION_ITEMS {
        int subscription_item_id PK
        int subscription_id FK
        int product_id FK
        int quantity
        numeric unit_price
        numeric subtotal
    }
```

`USERS` (#89) → `ORDERS` (#90): every new order belongs to the account that placed it (`orders.user_id`). Orders placed before #90 (guest checkout) have `user_id = NULL`. `CUSTOMERS` stays the delivery contact (name + phone from checkout).

## Tables

### CUSTOMERS

| Column | Type | Constraints | Notes |
|---|---|---|---|
| customer_id | SERIAL | PK | |
| name | VARCHAR(100) | NOT NULL | |
| phone | VARCHAR(15) | NOT NULL, UNIQUE | Identifies the customer (no login in POC) |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | Audit column (added beyond the minimum list) |

### PRODUCTS

| Column | Type | Constraints | Notes |
|---|---|---|---|
| product_id | SERIAL | PK | |
| name | VARCHAR(100) | NOT NULL | e.g. "Cow Milk" |
| size | VARCHAR(20) | NOT NULL | e.g. "500 ml" |
| price | NUMERIC(10,2) | NOT NULL, CHECK > 0 | Current price in INR |
| is_available | BOOLEAN | NOT NULL, default TRUE | Hidden from customers when false |
| stock_quantity | INTEGER | NOT NULL, DEFAULT 0, CHECK ≥ 0 | Bottles left (#92). Admin-only number; orders reduce it, cancelling restores it |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | Audit column |
| | | UNIQUE (name, size) | Prevents duplicate catalogue entries |

### ORDERS

| Column | Type | Constraints | Notes |
|---|---|---|---|
| order_id | SERIAL | PK | |
| customer_id | INTEGER | FK → customers, NOT NULL, ON DELETE RESTRICT | |
| order_date | TIMESTAMPTZ | NOT NULL, default now() | Stored in UTC, displayed in IST |
| total_amount | NUMERIC(10,2) | NOT NULL, CHECK ≥ 0 | Sum of item subtotals, calculated by backend |
| status | VARCHAR(20) | NOT NULL, default 'PLACED', CHECK in allowed values | See lifecycle in functional requirements |
| subscription_id | INTEGER | FK → subscriptions, NULL, ON DELETE RESTRICT | #97: the subscription that created this order; NULL for one-time orders |
| delivery_date | DATE | NULL | #97: the day (India time) a subscription order is for |
| | | UNIQUE (subscription_id, delivery_date) | #97: one order per subscription per day (NULLs never clash) |

### ORDER_ITEMS

| Column | Type | Constraints | Notes |
|---|---|---|---|
| order_item_id | SERIAL | PK | |
| order_id | INTEGER | FK → orders, NOT NULL, ON DELETE CASCADE | |
| product_id | INTEGER | FK → products, NOT NULL, ON DELETE RESTRICT | |
| quantity | INTEGER | NOT NULL, CHECK 1–20 | |
| unit_price | NUMERIC(10,2) | NOT NULL, CHECK > 0 | Price **snapshot** at order time |
| subtotal | NUMERIC(10,2) | NOT NULL, CHECK ≥ 0 | unit_price × quantity |
| | | UNIQUE (order_id, product_id) | One line per product per order |

## Relationships

| Relationship | Cardinality | Meaning |
|---|---|---|
| CUSTOMERS → ORDERS | 1 to 0..many | A customer can have many orders; each order belongs to exactly one customer |
| ORDERS → ORDER_ITEMS | 1 to 1..many | An order has at least one item; an item belongs to one order |
| PRODUCTS → ORDER_ITEMS | 1 to 0..many | A product can appear in many order lines |

`ORDERS` ↔ `PRODUCTS` is a **many-to-many** relationship resolved by the junction table `ORDER_ITEMS`.

### USERS (#89)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| user_id | SERIAL | PK | |
| full_name | VARCHAR(100) | NOT NULL | 2–100 characters |
| email | VARCHAR(254) | NOT NULL, UNIQUE | Stored in lower case |
| username | VARCHAR(30) | NOT NULL, UNIQUE | Stored in lower case; letters, digits, `.`, `_`, `-` |
| password_hash | VARCHAR(100) | NOT NULL | bcrypt hash (60 chars). **Never** the password |
| role | VARCHAR(10) | NOT NULL, DEFAULT `'USER'`, CHECK in (`USER`, `ADMIN`) | `ADMIN` only via `python -m app.scripts.create_admin` |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

### SUBSCRIPTIONS (#97)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| subscription_id | SERIAL | PK | |
| user_id | INTEGER | FK → users, NOT NULL, ON DELETE RESTRICT | The account that subscribed |
| customer_id | INTEGER | FK → customers, NOT NULL, ON DELETE RESTRICT | Delivery contact (name + phone) |
| plan | VARCHAR(20) | NOT NULL, CHECK in (`WEEK`, `HALF_MONTH`, `MONTH`) | 7, 15 or 30 days |
| start_date | DATE | NOT NULL | First delivery day |
| end_date | DATE | NOT NULL, CHECK ≥ start_date | Last delivery day, included |
| status | VARCHAR(20) | NOT NULL, DEFAULT `'ACTIVE'`, CHECK in (`ACTIVE`, `CANCELLED`, `COMPLETED`) | |
| daily_total | NUMERIC(10,2) | NOT NULL, CHECK ≥ 0 | Sum of the item subtotals (locked prices) |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| cancelled_at | TIMESTAMPTZ | NULL | Set when cancelled |
| | | UNIQUE (user_id) WHERE status = 'ACTIVE' | One active subscription per user (partial unique index) |

### SUBSCRIPTION_ITEMS (#97)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| subscription_item_id | SERIAL | PK | |
| subscription_id | INTEGER | FK → subscriptions, NOT NULL, ON DELETE CASCADE | |
| product_id | INTEGER | FK → products, NOT NULL, ON DELETE RESTRICT | A product in a subscription cannot be deleted |
| quantity | INTEGER | NOT NULL, CHECK 1–20 | Per day |
| unit_price | NUMERIC(10,2) | NOT NULL, CHECK > 0 | Price **locked** when subscribing; every daily order uses it |
| subtotal | NUMERIC(10,2) | NOT NULL, CHECK ≥ 0 | unit_price × quantity |
| | | UNIQUE (subscription_id, product_id) | One line per product |

## Normalization notes

- **1NF:** every column holds a single value; order lines are rows in `order_items`, not a list inside `orders`.
- **2NF:** in `order_items`, every non-key column depends on the whole key (`order_item_id`; also unique on `order_id + product_id`).
- **3NF:** customer name/phone live only in `customers`; product name/size only in `products`.

**Deliberate denormalization (and why it's correct):**
- `order_items.unit_price` copies `products.price` so historical orders keep the price paid even if the product price changes later.
- `order_items.subtotal` and `orders.total_amount` are derived values stored for fast reads and auditability. They are written once by the backend service and never edited by clients.

## Why `ON DELETE RESTRICT`?

Products and customers that appear in orders cannot be deleted, protecting order history. To remove a product from sale, set `is_available = false`.

## Indexes

| Index | Supports |
|---|---|
| `orders(customer_id)` | Order history by customer |
| `orders(status)` | Admin filter by status |
| `order_items(order_id)` | Loading items for an order |
| `customers(phone)` (via UNIQUE) | Find customer by phone |
| `subscriptions(user_id)`, `subscriptions(status)` | My subscriptions; daily order run (#97) |
| `uq_subscriptions_one_active_per_user` (partial, `WHERE status = 'ACTIVE'`) | One active subscription per user (#97) |
| `uq_orders_subscription_day` (UNIQUE) | No duplicate daily order; finding today's orders (#97) |

## Constraint names

Every constraint has an explicit, readable name (set by the naming convention in `backend/app/database/base.py`, M1-05) so migrations and error messages are easy to read. `database/init.sql` uses the same names.

| Table | Constraint | Rule |
|---|---|---|
| customers | `uq_customers_phone` | phone is unique |
| products | `ck_products_price_positive` | price > 0 |
| products | `uq_products_name_size` | (name, size) is unique |
| products | `ck_products_stock_quantity_non_negative` | stock_quantity ≥ 0 (#92) |
| orders | `orders_customer_id_fkey` | → customers, ON DELETE RESTRICT |
| orders | `orders_user_id_fkey` | → users, ON DELETE RESTRICT (#90) |
| orders | `ck_orders_total_amount_non_negative` | total_amount ≥ 0 |
| orders | `ck_orders_status_allowed` | status in the five allowed values |
| order_items | `order_items_order_id_fkey` | → orders, ON DELETE CASCADE |
| order_items | `order_items_product_id_fkey` | → products, ON DELETE RESTRICT |
| order_items | `ck_order_items_quantity_range` | quantity between 1 and 20 |
| order_items | `ck_order_items_unit_price_positive` | unit_price > 0 |
| order_items | `ck_order_items_subtotal_non_negative` | subtotal ≥ 0 |
| order_items | `uq_order_items_order_product` | (order_id, product_id) is unique |
| orders | `orders_subscription_id_fkey` | → subscriptions, ON DELETE RESTRICT (#97) |
| orders | `uq_orders_subscription_day` | (subscription_id, delivery_date) is unique (#97) |
| subscriptions | `ck_subscriptions_plan_allowed`, `ck_subscriptions_status_allowed` | allowed values (#97) |
| subscriptions | `ck_subscriptions_end_after_start`, `ck_subscriptions_daily_total_non_negative` | end_date ≥ start_date, daily_total ≥ 0 (#97) |
| subscription_items | `ck_subscription_items_quantity_range`, `…_unit_price_positive`, `…_subtotal_non_negative` | as for order_items (#97) |
| subscription_items | `uq_subscription_items_product` | (subscription_id, product_id) is unique (#97) |
| users | `uq_users_email` | email is unique |
| users | `uq_users_username` | username is unique |
| users | `ck_users_role_allowed` | role is `USER` or `ADMIN` |

Primary keys use PostgreSQL's default names (`customers_pkey`, …).

Reference DDL: [`../../database/init.sql`](../../database/init.sql). Seed data: [`../../database/seed.sql`](../../database/seed.sql).
