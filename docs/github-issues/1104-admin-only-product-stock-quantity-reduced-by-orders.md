<!-- issue-meta
title: [M11-04] Admin-only product stock quantity, reduced by orders
labels: feature
milestone: M11 - User Authentication and Admin Management
-->
# [M11-04] Admin-only product stock quantity, reduced by orders

**GitHub issue:** #92 · **Milestone:** M11 - User Authentication and Admin Management

### 1. Objective

Admins manage how many bottles of each product are in stock. Placing an order reduces the stock; cancelling an order puts it back. The quantity is visible to admins only.

### 2. Background

Products have only `is_available`. The dairy cannot track how much milk is left, and customers can order any amount.

### 5. Tasks

**Backend**
- [ ] Migration: `products.stock_quantity INTEGER NOT NULL CHECK (stock_quantity >= 0)`; existing products start at 100
- [ ] `POST/PATCH /api/v1/admin/products` accept `stock_quantity` (0–100000)
- [ ] New ADMIN-only `GET /api/v1/admin/products` returning `stock_quantity`
- [ ] Public `GET /products` and `/products/{id}` never return the number; they return `in_stock` (true/false)
- [ ] `POST /orders`: lock the product rows, refuse if a quantity is more than the stock (409 `INSUFFICIENT_STOCK`, no number in the message), otherwise reduce the stock in the same transaction
- [ ] Cancelling an order (`PATCH /admin/orders/{id}/status` → `CANCELLED`) adds the quantities back

**Frontend**
- [ ] Admin Products: Stock column; stock field in the Add/Edit form
- [ ] Shop: products with no stock show "Out of stock" and cannot be added to the cart
- [ ] Checkout shows the backend message for `INSUFFICIENT_STOCK`

### 7. Acceptance criteria

- [ ] Only admins see stock numbers (not in any public API response)
- [ ] An order reduces the stock of each ordered product by its quantity
- [ ] Ordering more than the stock is refused and nothing is saved
- [ ] Cancelling an order restores its quantities
- [ ] Out-of-stock products cannot be added to the cart

### 8. Testing requirements

- API/service tests for each rule above, including two orders for the last bottles
- Migration test; browser walkthrough

### 10. Definition of Done

- [ ] Acceptance criteria met, tests passing, docs updated, PR reviewed and merged into `develop`
