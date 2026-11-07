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
-- ============================================================

CREATE TABLE customers (
    customer_id  SERIAL       PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    phone        VARCHAR(15)  NOT NULL UNIQUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
    product_id    SERIAL        PRIMARY KEY,
    name          VARCHAR(100)  NOT NULL,
    size          VARCHAR(20)   NOT NULL,
    price         NUMERIC(10,2) NOT NULL CHECK (price > 0),
    is_available  BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_products_name_size UNIQUE (name, size)
);

CREATE TABLE orders (
    order_id      SERIAL        PRIMARY KEY,
    customer_id   INTEGER       NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT,
    order_date    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    total_amount  NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
    status        VARCHAR(20)   NOT NULL DEFAULT 'PLACED'
                  CHECK (status IN ('PLACED','CONFIRMED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED'))
);

CREATE TABLE order_items (
    order_item_id  SERIAL        PRIMARY KEY,
    order_id       INTEGER       NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    product_id     INTEGER       NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
    quantity       INTEGER       NOT NULL CHECK (quantity BETWEEN 1 AND 20),
    unit_price     NUMERIC(10,2) NOT NULL CHECK (unit_price > 0),
    subtotal       NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
    CONSTRAINT uq_order_items_order_product UNIQUE (order_id, product_id)
);

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status      ON orders(status);
CREATE INDEX idx_order_items_order  ON order_items(order_id);
