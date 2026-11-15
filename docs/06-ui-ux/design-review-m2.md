# M2 Design Review (issue #33)

**Status:** Prepared for project-owner review. **Not yet approved.**
**Prepared:** 8 Nov 2026 · Branch `feat/harish` · Frontend milestone M2 (#20–#32)

This review checks every M2 screen against [`design-system.md`](design-system.md) and the requirements before M3 connects the real API. All screenshots and measurements were taken from the **production build** (`npm run build` + `npm run preview`) with the mock services, in Microsoft Edge (headless) at **360 px** (phone) and **1280 px** (desktop).

## 1. Screens

All screenshots are in [`screens/`](screens/) as WebP (26 files, about 0.6 MB).

| # | Screen | Route | Phone (360 px) | Desktop (1280 px) |
|---|---|---|---|---|
| 01 | Customer home | `/` | [view](screens/01-home-360.webp) | [view](screens/01-home-1280.webp) |
| 02 | Product details | `/products/2` | [view](screens/02-product-details-360.webp) | [view](screens/02-product-details-1280.webp) |
| 03 | Cart (filled) | `/cart` | [view](screens/03-cart-360.webp) | [view](screens/03-cart-1280.webp) |
| 04 | Cart (empty) | `/cart` | [view](screens/04-cart-empty-360.webp) | [view](screens/04-cart-empty-1280.webp) |
| 05 | Checkout | `/checkout` | [view](screens/05-checkout-360.webp) | [view](screens/05-checkout-1280.webp) |
| 06 | Order history | `/orders?phone=…` | [view](screens/06-order-history-360.webp) | [view](screens/06-order-history-1280.webp) |
| 07 | Order details + timeline | `/orders/97` | [view](screens/07-order-details-360.webp) | [view](screens/07-order-details-1280.webp) |
| 08 | Page not found (404) | any unknown URL | [view](screens/08-not-found-360.webp) | [view](screens/08-not-found-1280.webp) |
| 09 | Order confirmation | `/orders/:id/confirmation` | [view](screens/09-order-confirmation-360.webp) | [view](screens/09-order-confirmation-1280.webp) |
| 10 | Admin dashboard | `/admin` | [view](screens/10-admin-dashboard-360.webp) | [view](screens/10-admin-dashboard-1280.webp) |
| 11 | Admin orders | `/admin/orders` | [view](screens/11-admin-orders-360.webp) | [view](screens/11-admin-orders-1280.webp) |
| 12 | Admin order details sheet | `/admin/orders?order=101` | [view](screens/12-admin-order-sheet-360.webp) | [view](screens/12-admin-order-sheet-1280.webp) |
| 13 | Admin products | `/admin/products` | [view](screens/13-admin-products-360.webp) | [view](screens/13-admin-products-1280.webp) |

Loading, empty and error states (M2-13) can be reviewed live with the dev-only "Mock" switch (`npm run dev`, bottom-left button).

## 2. Design-system check (measured in the browser)

| Rule (design-system.md) | Measured | Result |
|---|---|---|
| Font Manrope; body 14/22 px, weight 500 | `"Manrope Variable"`, 14 px / 22 px, 500; font loaded | ✅ |
| Page background `#F8FAFC`, text `#0F172A` | rgb(248, 250, 252), rgb(15, 23, 42) | ✅ |
| Primary button `#2563EB`, radius 12 px (`rounded-xl`) | rgb(37, 99, 235), 12 px, white text | ✅ |
| Cards white, `rounded-2xl` (16 px), subtle shadow | white, 16 px, `0 2px 12px rgba(15,23,42,0.06)` | ✅ |
| Inputs `rounded-xl`, border `#E2E8F0` | 12 px, rgb(226, 232, 240), 44 px tall | ✅ |
| Display 28/36 · 800, Price 18/24 · 800 | 28 px · 800, 18 px · 800 | ✅ |
| Chips `rounded-full` | fully rounded | ✅ |
| Touch targets ≥ 44 px | "+" 44×44, quantity buttons 44×44, nav links 44 px tall | ✅ |
| Status badge colours | match the status badge table on every screen | ✅ |
| Gutter 16/24/32 px, max width 1200 px | applied in both layouts | ✅ |
| Product grid 2 / 3 / 4 columns | 2 at 360 px, 3 at 768 px, 4 at 1280 px | ✅ |
| No horizontal scrolling | none on all 26 screen captures | ✅ |

## 3. Scope check (things that must NOT appear)

Scanned the text of every screen for payments, cards/UPI, coupons/discounts, ratings/reviews, shipping/delivery fees, addresses, OTP, subscriptions, WhatsApp and maps.

- ✅ None of the out-of-scope features appear. Payment is "cash on delivery" text only.
- ℹ️ The word "OTP" appears once, in the checkout hint "We use it to find your orders later. **No OTP needed.**" It states that OTP is not used. See follow-up F7 if the owner prefers to remove the word.

## 4. Accessibility

### Lighthouse (13.6.0, mobile form factor, production build)

| Page | Accessibility | Failed audits | Performance (for information) |
|---|---|---|---|
| Home `/` | **100** | none | 99 (FCP 0.8 s, CLS 0) |
| Checkout `/checkout` (with 3 items in the cart) | **100** | none | 99 (FCP 0.8 s, CLS 0) |

The checkout audit was run against a browser that already held a cart, and Lighthouse's own final screenshot was checked to confirm it scored the filled form, not the empty-cart page.

### Keyboard-only check

| Task | Result |
|---|---|
| Tab order on home: logo → nav → chips → each product card → its "+" button → footer | ✅ Logical; visible 2 px blue focus ring on every element |
| Add a product with quantity 2 and place an order without a mouse | ✅ Order placed (confirmation reached) |
| Checkout errors | ✅ Focus moves to the first invalid field; errors are linked with `aria-describedby` |
| Admin: open an order sheet, change status with the dropdown, close with Escape | ✅ Works — after fix below |

### Issues found and fixed during this review

| Issue | Fix |
|---|---|
| Closing the admin order sheet with Escape lost keyboard focus (it went to the page body). | Focus now returns to the "View order" button that opened it (`fix(frontend): return keyboard focus…`, `5dd4aac`). |
| On phones, the stacked "View my orders" / "Continue shopping" buttons on the confirmation page were only ~24 px tall. | Now 48 px on all widths (`fix(frontend): keep confirmation buttons 48px tall…`, `ea86410`). |

## 5. Suggested follow-up issues

Minor items that should not block approval. **Not created on GitHub yet** — to be created after the owner agrees.

| # | Suggestion | Why | Suggested milestone |
|---|---|---|---|
| F1 | Remove the temporary `/design` page | It was only for this review ("remove after M2-14 approval"). | M2 / M3 |
| F2 | Decide whether the API should return product `image_url` and `description` | The contract has neither; the frontend maps them from the product name (`lib/productDisplay.ts`). | M3 (contract) |
| F3 | Standardise on Node 22 LTS or newer | Docs and the CI plan say Node 20, but React Router 8 needs ≥ 22.22 and the M2 test runner needs ≥ 22.18. | M5 (ADR + CI) |
| F4 | Split the JavaScript bundle by route (lazy-load admin pages) | The main bundle is about 600 kB (184 kB gzipped); Vite warns above 500 kB. Lighthouse performance is still 99. | M4 / M5 |
| F5 | Add a "today's orders" figure to the admin API | The dashboard counts today's orders from the latest 100 orders only. | M3 |
| F6 | Backend order lists: `ORDER BY order_date DESC, order_id DESC` | The mock needed this tie-break for orders placed in the same second. | M3 |
| F7 | (Optional wording) Checkout hint "No OTP needed" | Mentions an out-of-scope feature, even if only to say it is absent. | M2 polish |
| F8 | Replace Node's built-in test runner with Vitest + React Testing Library | Already planned in M4-04 (#49); listed here for completeness. | M4 |

## 6. Approval

| Role | Name | Decision | Date |
|---|---|---|---|
| Project owner | _to be completed_ | ☐ Approved ☐ Approved with follow-ups ☐ Changes requested | |

Per issue #33, approval is recorded as a **comment on the GitHub issue** by the project owner.
