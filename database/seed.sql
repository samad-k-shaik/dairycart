-- ============================================================
-- Milk Delivery POC – initial seed data
-- ============================================================
-- Loaded after migrations in local development (M1 decides how:
-- an Alembic data migration or a seed script).
-- Prices are in Indian Rupees (INR).
-- ============================================================

INSERT INTO products (name, size, price, is_available) VALUES
    ('Cow Milk',     '500 ml',   30.00, TRUE),
    ('Cow Milk',     '1 Litre',  60.00, TRUE),
    ('Buffalo Milk', '500 ml',   35.00, TRUE),
    ('Buffalo Milk', '1 Litre',  70.00, TRUE)
ON CONFLICT (name, size) DO NOTHING;

-- Demo customer for the POC (no authentication in scope).
INSERT INTO customers (name, phone) VALUES
    ('Demo Customer', '9000000001')
ON CONFLICT (phone) DO NOTHING;
