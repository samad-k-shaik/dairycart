# Design System

## Design reference

Visual reference (Dribbble grocery e-commerce concept):
<https://images.openai.com/static-rsc-4/-GVHw03LuRM_dJYZDSUJI2foLm2PpUpjLcDwPc6WQT0gc3iUP-NLd2pTwj0oljxz98EYcygjb1vBr6SP-Wwze4QvIpJXgD-H9xuXS_nWyfvA78Be-en5poM2giMbjhQhCe7XGMlE-mM4VpbfXvEWJuupO-bOc0DbSfuX3-Mnru8?purpose=inline>

We are **recreating its design language** (clean, premium grocery UI) with our own stack. We make no claim about the technology the original design used, and we do not copy its brand, logos or images.

## Principles

1. **Clean and premium** – generous white space, few colours, crisp typography.
2. **Mobile-first** – designed at 360–414 px, then expanded for tablet/desktop.
3. **Consistent** – every spacing, radius and colour comes from the tokens below.
4. **Accessible** – contrast ≥ 4.5:1 for text, visible focus rings, labelled inputs.

## Colour tokens

| Token | Hex | Tailwind usage | Use |
|---|---|---|---|
| `primary` | `#2563EB` | `bg-primary`, `text-primary` | Buttons, links, active states |
| `primary-hover` | `#1D4ED8` | `hover:bg-primary-hover` | Hover/pressed |
| `primary-soft` | `#EFF6FF` | `bg-primary-soft` | Selected chips, badges |
| `background` | `#F8FAFC` | `bg-background` | Page background (light grey) |
| `surface` | `#FFFFFF` | `bg-surface` | Cards, sheets, header |
| `border` | `#E2E8F0` | `border-border` | Dividers, input borders |
| `text` | `#0F172A` | `text-foreground` | Primary text |
| `text-muted` | `#64748B` | `text-muted-foreground` | Secondary text |
| `success` | `#16A34A` | `text-success`, `bg-success` | DELIVERED, success toasts |
| `warning` | `#D97706` | `text-warning`, `bg-warning` | OUT_FOR_DELIVERY |
| `danger` | `#DC2626` | `text-danger`, `bg-danger` | CANCELLED, errors |

These map to shadcn/ui CSS variables (`--primary`, `--background`, …) in `frontend/src/index.css` (set up in M2-02). Live preview of every token: `http://localhost:5173/design` (temporary, until the M2 design approval).

### Status badge colours

| Status | Background / text |
|---|---|
| PLACED | `primary-soft` / `primary` |
| CONFIRMED | indigo-50 / indigo-700 |
| OUT_FOR_DELIVERY | amber-50 / amber-700 |
| DELIVERED | green-50 / green-700 |
| CANCELLED | red-50 / red-700 |

## Typography

Font: **Manrope**, self-hosted via `@fontsource-variable/manrope` (all weights in one file), fallback `system-ui, sans-serif`.

| Style | Size / line-height | Weight | Tailwind usage | Use |
|---|---|---|---|---|
| Display | 28 / 36 px | 800 | `text-display font-extrabold` | Home hero |
| H1 | 24 / 32 px | 700 | `text-h1 font-bold` | Page titles |
| H2 | 20 / 28 px | 700 | `text-h2 font-bold` | Section titles |
| H3 | 16 / 24 px | 600 | `text-h3 font-semibold` | Card titles |
| Body | 14 / 22 px | 500 | `text-body font-medium` (body default) | Default text |
| Small | 12 / 16 px | 500 | `text-small font-medium` | Labels, metadata |
| Price | 18 / 24 px | 800 | `text-price font-extrabold` | Product prices |

## Spacing, radius, shadow

- **Spacing scale:** 4 px base (Tailwind default): 4, 8, 12, 16, 24, 32, 48.
- **Page gutter:** 16 px mobile, 24 px tablet, 32 px desktop. Max content width 1200 px.
- **Radius:** cards `rounded-2xl` (16 px), buttons/inputs `rounded-xl` (12 px), chips `rounded-full`.
- **Shadow:** cards `shadow-card` (= `0 2px 12px rgba(15,23,42,0.06)`); elevated sheets `shadow-lg`. Keep shadows subtle.

## Breakpoints

| Name | Min width | Product grid |
|---|---|---|
| base | 0 | 2 columns |
| `md` | 768 px | 3 columns |
| `lg` | 1024 px | 4 columns |

## Core components

| Component | Source | Notes |
|---|---|---|
| Button | shadcn `Button` | Variants: primary, secondary (outline), ghost, destructive |
| ProductCard | custom | White surface, rounded-2xl, image on soft background, name, size, price, round "+" add button |
| QuantitySelector | custom | − / value / + with 1–20 bounds, 44 px touch targets |
| CartItem / CartSummary | custom | Line subtotal, estimated total, "Total confirmed at checkout" note |
| StatusBadge | shadcn `Badge` | Colours above |
| Input, Label, Form | shadcn | Inline error text in `danger` |
| Table | shadcn `Table` | Admin orders/products |
| Sheet / Dialog | shadcn | Admin order details, confirmations |
| Toast | shadcn `Sonner` | Success/error feedback |
| Icons | Lucide React | `ShoppingCart`, `Plus`, `Minus`, `Package`, `Truck`, `CheckCircle2`, `LayoutDashboard` |

## Screens (M2 scope)

| # | Screen | Key elements |
|---|---|---|
| 1 | Customer home | Header (logo, cart icon with count), hero banner, category chips (Cow, Buffalo), product grid |
| 2 | Product details | Large image, name, size, price, description, quantity selector, sticky "Add to cart" on mobile |
| 3 | Shopping cart | Cart items, quantity edit/remove, summary, "Checkout" button, empty state |
| 4 | Checkout & confirmation | Name + phone form, order summary, "Place order"; confirmation with order id, items, total, status |
| 5 | Customer order history | Phone lookup, list of order cards (date, total, status badge), details view |
| 6 | Admin dashboard | Sidebar/top nav, stat cards (total, today, per status), recent orders |
| 7 | Admin order management | Filterable table, details sheet with items, status dropdown limited to allowed next statuses |

Admin products list (read-only table) reuses the table component.

## Imagery

- Product images: clean photos or illustrations on a light background, square (1:1), WebP, ≤ 100 KB, stored in `frontend/public/images/products/`.
- Use only images we own, created ourselves, or licensed for reuse. Record the source in `frontend/public/images/README.md` when images are added.
- Every image has meaningful `alt` text. Exception: purely decorative backgrounds are `aria-hidden` and have no alt text.
- **Customer page background (#93):** a dairy-barn photo (`frontend/public/images/backgrounds/dairy-barn.webp`, 1600×900 WebP, ~250 KB) is fixed behind every customer page (`CustomerLayout`), under a veil of the page colour at 85% (`bg-background/85`) so it stays light. Admin pages keep the plain background.
- On customer pages `muted-foreground` is one shade darker (`#475569`, slate-600): over the darkest part of the photo, the normal `#64748B` only reaches about 3.3:1 contrast, and `#475569` keeps it above 4.5:1 (WCAG AA). Body text (`foreground`) stays above 12:1.

## Approval gate

M2 screens use **mock JSON** only. The design is reviewed and approved (screenshots attached to the M2 review issue) **before** M3 connects real APIs.

The M2 review (screenshots of every screen, design-system measurements, scope check, keyboard and Lighthouse results, follow-ups) is in [`design-review-m2.md`](design-review-m2.md); screenshots are in [`screens/`](screens/).
