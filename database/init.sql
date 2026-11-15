-- ============================================================
-- Milk Delivery POC – reference schema (M0)
-- ============================================================
-- PURPOSE: a readable, plain-SQL version of the ERD in
-- docs/04-architecture/database-erd.md so learners can see the
-- tables, keys and constraints in one place.
--
-- SOURCE OF TRUTH: from M1 onward the real schema is created and
-- changed ONLY through Alembic migrations (backend/alembic/).
-- If a migration changes the schema, update this file and the ERD.
--
-- Constraint names match the SQLAlchemy models (backend/app/models/,
-- naming convention in backend/app/database/base.py), M1-05.
-- ============================================================

CREATE TABLE customers (
    customer_id  SERIAL       PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    phone        VARCHAR(15)  NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_customers_phone UNIQUE (phone)
);

CREATE TABLE products (
    product_id    SERIAL        PRIMARY KEY,
    name          VARCHAR(100)  NOT NULL,
    size          VARCHAR(20)   NOT NULL,
    price         NUMERIC(10,2) NOT NULL,
    is_available  BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_products_price_positive CHECK (price > 0),
    CONSTRAINT uq_products_name_size UNIQUE (name, size)
);

CREATE TABLE orders (
    order_id      SERIAL        PRIMARY KEY,
    customer_id   INTEGER       NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT,
    order_date    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    total_amount  NUMERIC(10,2) NOT NULL,
    status        VARCHAR(20)   NOT NULL DEFAULT 'PLACED',
    CONSTRAINT ck_orders_total_amount_non_negative CHECK (total_amount >= 0),
    CONSTRAINT ck_orders_status_allowed
        CHECK (status IN ('PLACED','CONFIRMED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED'))
);

CREATE TABLE order_items (
    order_item_id  SERIAL        PRIMARY KEY,
    order_id       INTEGER       NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    product_id     INTEGER       NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
    quantity       INTEGER       NOT NULL,
    unit_price     NUMERIC(10,2) NOT NULL,
    subtotal       NUMERIC(10,2) NOT NULL,
    CONSTRAINT ck_order_items_quantity_range CHECK (quantity BETWEEN 1 AND 20),
    CONSTRAINT ck_order_items_unit_price_positive CHECK (unit_price > 0),
    CONSTRAINT ck_order_items_subtotal_non_negative CHECK (subtotal >= 0),
    CONSTRAINT uq_order_items_order_product UNIQUE (order_id, product_id)
);

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status      ON orders(status);
CREATE INDEX idx_order_items_order  ON order_items(order_id);

-- Accounts (#89, migration add_users_table). #121: the login is the mobile number
-- (migration login_by_mobile_number); email and username were removed.
CREATE TABLE users (
    user_id        SERIAL        PRIMARY KEY,
    full_name      VARCHAR(100)  NOT NULL,
    phone          VARCHAR(10)   NOT NULL,   -- 10 digits, without +91
    password_hash  VARCHAR(100)  NOT NULL,   -- bcrypt hash, never the password
    role           VARCHAR(10)   NOT NULL DEFAULT 'USER',
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_users_phone UNIQUE (phone),
    CONSTRAINT ck_users_phone_format CHECK (phone ~ '^[6-9][0-9]{9}$'),
    CONSTRAINT ck_users_role_allowed CHECK (role IN ('USER','ADMIN'))
);

-- Orders belong to the account that placed them (#90, migration add_user_id_to_orders).
-- NULL = an order placed before #90 (guest checkout).
ALTER TABLE orders ADD COLUMN user_id INTEGER
    CONSTRAINT orders_user_id_fkey REFERENCES users(user_id) ON DELETE RESTRICT;
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Stock per product (#92, migration add_stock_quantity_to_products). Admin-only number.
-- (The migration gives products that already exist 100; new ones default to 0.)
ALTER TABLE products ADD COLUMN stock_quantity INTEGER NOT NULL DEFAULT 0
    CONSTRAINT ck_products_stock_quantity_non_negative CHECK (stock_quantity >= 0);

-- Subscriptions (#97, migration add_subscriptions): the same items every day for 7/15/30 days.
-- Each day an admin (or app.scripts.generate_subscription_orders) creates one normal order.
CREATE TABLE subscriptions (
    subscription_id SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users (user_id) ON DELETE RESTRICT,
    customer_id     INTEGER NOT NULL REFERENCES customers (customer_id) ON DELETE RESTRICT,
    plan            VARCHAR(20) NOT NULL
        CONSTRAINT ck_subscriptions_plan_allowed CHECK (plan IN ('WEEK', 'HALF_MONTH', 'MONTH')),
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CONSTRAINT ck_subscriptions_status_allowed CHECK (status IN ('ACTIVE', 'CANCELLED', 'COMPLETED')),
    daily_total     NUMERIC(10, 2) NOT NULL
        CONSTRAINT ck_subscriptions_daily_total_non_negative CHECK (daily_total >= 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    cancelled_at    TIMESTAMPTZ,
    CONSTRAINT ck_subscriptions_end_after_start CHECK (end_date >= start_date)
);
CREATE INDEX idx_subscriptions_user_id ON subscriptions (user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions (status);
-- One ACTIVE subscription per user: a partial unique index ignores cancelled/completed rows.
CREATE UNIQUE INDEX uq_subscriptions_one_active_per_user ON subscriptions (user_id) WHERE status = 'ACTIVE';

CREATE TABLE subscription_items (
    subscription_item_id SERIAL PRIMARY KEY,
    subscription_id INTEGER NOT NULL REFERENCES subscriptions (subscription_id) ON DELETE CASCADE,
    product_id      INTEGER NOT NULL REFERENCES products (product_id) ON DELETE RESTRICT,
    quantity        INTEGER NOT NULL CONSTRAINT ck_subscription_items_quantity_range CHECK (quantity BETWEEN 1 AND 20),
    unit_price      NUMERIC(10, 2) NOT NULL CONSTRAINT ck_subscription_items_unit_price_positive CHECK (unit_price > 0),
    subtotal        NUMERIC(10, 2) NOT NULL CONSTRAINT ck_subscription_items_subtotal_non_negative CHECK (subtotal >= 0),
    CONSTRAINT uq_subscription_items_product UNIQUE (subscription_id, product_id)
);

ALTER TABLE orders
    ADD COLUMN subscription_id INTEGER REFERENCES subscriptions (subscription_id) ON DELETE RESTRICT,
    ADD COLUMN delivery_date DATE,
    ADD CONSTRAINT uq_orders_subscription_day UNIQUE (subscription_id, delivery_date);

-- Delivery frequency (#99, migration add_every_n_days_to_subscriptions): every day (1),
-- every 2nd day (2) or every 3rd day (3) from start_date.
ALTER TABLE subscriptions ADD COLUMN every_n_days INTEGER NOT NULL DEFAULT 1
    CONSTRAINT ck_subscriptions_every_n_days_allowed CHECK (every_n_days IN (1, 2, 3));

-- Delivery time slots (#100, migration add_delivery_slots): managed by the admin; every
-- subscription books one. Orders keep a text copy of the slot (orders.delivery_slot).
CREATE TABLE delivery_slots (
    delivery_slot_id SERIAL PRIMARY KEY,
    name             VARCHAR(50) NOT NULL,
    start_time       TIME NOT NULL,
    end_time         TIME NOT NULL,
    capacity         INTEGER NOT NULL CONSTRAINT ck_delivery_slots_capacity_range CHECK (capacity BETWEEN 1 AND 1000),
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_delivery_slots_end_after_start CHECK (end_time > start_time),
    CONSTRAINT uq_delivery_slots_times UNIQUE (start_time, end_time)
);
-- The two standard slots (editable by the admin).
INSERT INTO delivery_slots (name, start_time, end_time, capacity) VALUES
    ('Morning', '08:00', '09:00', 50),
    ('Evening', '17:00', '18:00', 50);
ALTER TABLE subscriptions ADD COLUMN delivery_slot_id INTEGER
    REFERENCES delivery_slots (delivery_slot_id) ON DELETE RESTRICT;
CREATE INDEX idx_subscriptions_delivery_slot_id ON subscriptions (delivery_slot_id);
ALTER TABLE orders ADD COLUMN delivery_slot VARCHAR(100);

-- Saved delivery addresses (#102, migration add_addresses). Orders and subscriptions keep
-- a TEXT COPY of the chosen address (delivery_address), not a foreign key.
CREATE TABLE addresses (
    address_id  SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    label       VARCHAR(30) NOT NULL,
    house       VARCHAR(100) NOT NULL,
    street      VARCHAR(150) NOT NULL,
    landmark    VARCHAR(100),
    city        VARCHAR(50) NOT NULL,
    pincode     VARCHAR(6) NOT NULL CONSTRAINT ck_addresses_pincode_format CHECK (pincode ~ '^[1-9][0-9]{5}$'),
    is_default  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_addresses_user_id ON addresses (user_id);
-- One default address per user: a partial unique index only counts default rows.
CREATE UNIQUE INDEX uq_addresses_one_default_per_user ON addresses (user_id) WHERE is_default;
ALTER TABLE orders ADD COLUMN delivery_address VARCHAR(500);
ALTER TABLE subscriptions ADD COLUMN delivery_address VARCHAR(500);

-- Delivery boys and their areas (#103, migration add_delivery_boys). Admin records only:
-- delivery boys do not log in. One delivery boy per PIN code.
CREATE TABLE delivery_boys (
    delivery_boy_id SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    phone           VARCHAR(10) NOT NULL CONSTRAINT ck_delivery_boys_phone_format CHECK (phone ~ '^[6-9][0-9]{9}$'),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_delivery_boys_phone UNIQUE (phone)
);
CREATE TABLE delivery_areas (
    delivery_area_id SERIAL PRIMARY KEY,
    pincode          VARCHAR(6) NOT NULL CONSTRAINT ck_delivery_areas_pincode_format CHECK (pincode ~ '^[1-9][0-9]{5}$'),
    area_name        VARCHAR(50),
    delivery_boy_id  INTEGER NOT NULL REFERENCES delivery_boys (delivery_boy_id) ON DELETE CASCADE,
    CONSTRAINT uq_delivery_areas_pincode UNIQUE (pincode)
);
CREATE INDEX idx_delivery_areas_delivery_boy_id ON delivery_areas (delivery_boy_id);
-- The address's PIN code on orders and subscriptions, to match the delivery boy.
ALTER TABLE orders ADD COLUMN delivery_pincode VARCHAR(6);
ALTER TABLE subscriptions ADD COLUMN delivery_pincode VARCHAR(6);
