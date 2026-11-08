# frontend/

React + Vite + TypeScript application containing both the **customer** and **admin** UIs (separate route trees, one app).

The Vite project was scaffolded in M2-01 (#20); Tailwind CSS, shadcn/ui and the design tokens were added in M2-02 (#21). Routing comes in M2-04 (#23). Empty folders keep a `.gitkeep` placeholder so the agreed structure is visible.

## Setup

**Prerequisite:** Node.js LTS (`node --version`). The docs and CI plan specify Node 20; this scaffold was verified with Node 26.13.0 / npm 11.20.0.

```bash
cd frontend
npm ci            # install the exact versions from package-lock.json
npm run dev       # start the dev server at http://localhost:5173
```

Use `npm ci` (not `npm install`) for normal setup so everyone gets identical dependencies. Use `npm install <package>` only when an issue approves adding a library; then commit the updated `package-lock.json`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 5173 with hot reload (fails instead of switching port if 5173 is busy) |
| `npm run build` | Type-checks, then builds optimised production files into `dist/` |
| `npm run preview` | Serves the built `dist/` locally to check the production build |
| `npm run typecheck` | Type-checks all code without building (`tsc -b`) |
| `npm test` | Runs unit tests (`src/**/*.test.ts`) with Node's built-in test runner |

`npm test` uses Node's built-in runner, which runs TypeScript directly (needs Node ≥ 22.18; verified on Node 26). It is a stop-gap until Vitest is set up in M4-04 (#49). Because tests run in plain Node, test files and the modules they import must use relative imports with a `.ts` extension, not `@/`. Test files are type-checked by `tsconfig.node.json` and excluded from `tsconfig.app.json`.

`typecheck` uses `tsc -b` rather than `tsc --noEmit`: the root `tsconfig.json` only references `tsconfig.app.json` (app code) and `tsconfig.node.json` (`vite.config.ts`), so plain `tsc --noEmit` would check no files. Both referenced configs set `noEmit`, so nothing is written.

## Conventions

- TypeScript **strict mode** is on (`tsconfig.app.json`).
- Import from `src/` with the `@/` alias, e.g. `import App from '@/App.tsx'`. The alias is defined in `tsconfig.json` and `tsconfig.app.json` (`paths`, the shadcn CLI reads the root one) and in `vite.config.ts` (`resolve.alias`); keep them in sync.

## Routing and layouts (M2-04, #23)

React Router (`react-router`, ADR-011) maps URLs to pages in `src/routes/router.tsx`. Each layout is a parent route; its pages are child routes rendered inside the layout's `<Outlet />`.

| URL | Page | Layout |
|---|---|---|
| `/` | `pages/customer/HomePage` | CustomerLayout |
| `/products/:id` | `pages/customer/ProductDetailsPage` | CustomerLayout |
| `/cart` | `pages/customer/CartPage` | CustomerLayout |
| `/checkout` | `pages/customer/CheckoutPage` | CustomerLayout |
| `/orders` | `pages/customer/OrderHistoryPage` | CustomerLayout |
| `/orders/:id/confirmation` | `pages/customer/OrderConfirmationPage` | CustomerLayout |
| `/admin` | `pages/admin/DashboardPage` | AdminLayout |
| `/admin/orders` | `pages/admin/OrdersPage` | AdminLayout |
| `/admin/products` | `pages/admin/ProductsPage` | AdminLayout |
| any other URL | `pages/NotFoundPage` (404) | the layout of its tree |
| `/design` | `pages/DesignPage` (temporary) | none |

- **CustomerLayout:** sticky header with logo, Home, My orders and a cart icon (count is a placeholder `0` until M2-07). Below 640px the link text is visually hidden (still read by screen readers) and only icons show.
- **AdminLayout:** sidebar from 768px; below that a top bar with the three links sharing one row and a "Back to shop" icon.
- Pages are placeholders (`components/common/PagePlaceholder`) naming the issue that builds them.
- React Router 8 requires Node ≥ 22.22.

## Data: types, services and mock data (M2-03, #22)

- **Types** in `src/types/` (`product.ts`, `order.ts`, `api.ts`) mirror `docs/05-api/api-contracts.md` field-for-field, in `snake_case`. Money is a string (`"60.00"`), dates are ISO 8601 UTC strings.
- **Services** in `src/services/` are the only way pages get data:

  | Function | Endpoint |
  |---|---|
  | `getProducts({ includeUnavailable? })` | `GET /products` |
  | `getProduct(id)` | `GET /products/{id}` |
  | `createOrder(request)` | `POST /orders` |
  | `getOrder(id)` | `GET /orders/{id}` |
  | `getOrdersByPhone(phone)` | `GET /orders?phone=` (proposed, ADR-005) |
  | `getAdminOrders({ status?, page?, page_size? })` | `GET /admin/orders` |
  | `updateOrderStatus(id, status)` | `PATCH /admin/orders/{id}/status` |

- **Rule:** pages and components never import `src/services/mock/*` or the JSON files. In M3 only the service bodies change to HTTP calls; their names, parameters and return types stay the same.
- **Errors:** failed calls reject with `ServiceError` (`status`, `code`, `body` in the contract's error format), for mock and real calls alike.
- **Mock behaviour (M2):** every call waits 300 ms (`MOCK_LATENCY_MS`) and follows the contract's validation and error codes (400, 404, 409, 422). Data lives in memory: new orders and status changes last until the page is reloaded. `src/services/mock/mockData.test.ts` checks the JSON against the contract and business rules (statuses, maths, unique ids).
- **Formatting:** `formatCurrency("155.00")` → `"₹155.00"` (`src/lib/format.ts`), Indian digit grouping.

## Server state with TanStack Query (M2-05, #24)

- `QueryClientProvider` wraps the app in `main.tsx`; the client is configured in `src/lib/queryClient.ts` (data fresh for 30 s; 4xx errors such as 404 are never retried, other failures at most twice).
- Pages read server data through hooks in `src/hooks/` (e.g. `useProducts()`), which call the services. `useQuery` provides `isPending`, `isError`, `data` and `refetch` for loading, error and success states.
- Hooks: `useProducts()` (home grid) and `useProduct(id)` (details page; a 404/422 shows "Product not found").
- **Quantity rules** (1–20) live in `src/lib/quantity.ts` and are enforced by `components/common/QuantitySelector` (controlled component, − disabled at 1 and + at 20, 44px buttons). The backend still validates quantity; the UI check is for usability only.
- **Money estimates** for display (e.g. "Add to cart · ₹120.00") use `src/lib/money.ts`, which calculates in whole paise. Real totals always come from the backend.
- **Product images and descriptions are frontend-only.** The API contract has no `image` or `description` field, so `src/lib/productDisplay.ts` maps them (and the Cow/Buffalo category) from the product name. Image sources are recorded in `public/images/README.md`.

## Cart (M2-07, #26)

The cart lives in the browser (ADR-004): React context + `useReducer`, saved to `localStorage` under the key `milk-cart-v1`.

- **Use it:** `const { lines, itemCount, estimatedTotal, add, setQuantity, remove, clear } = useCart()` anywhere inside `<CartProvider>` (wrapped in `App.tsx`). `useAddToCart()` adds and shows the toast used by the home and details pages.
- **Rules** (`src/hooks/cart/cartReducer.ts`, unit-tested): adding a product already in the cart merges into one line; quantity is always 1–20 (extra is not added, and the toast says so).
- **Stored per line:** `product_id`, `quantity` and a display snapshot (`name`, `size`, `price`). Nothing else.
- **Estimated total only.** Sums are calculated in whole paise; the real total comes from the backend at checkout.
- **Safe storage:** missing, corrupt or tampered data restores as an empty cart or only its valid lines; if `localStorage` is blocked or full, the cart still works for the current visit.
- **Cart page (M2-08, #27):** `components/cart/CartItem` (image, name, size, unit price, `QuantitySelector`, line subtotal, remove) and `components/cart/CartSummary` (item count, estimated total, "Final total confirmed at checkout", Checkout). Subtotals and the total are derived from the lines on every render, never stored. Removing shows an Undo toast that restores the line at its old position. The empty state links to products, and Checkout is disabled while the cart is empty. No discounts, delivery fees or tax lines (out of scope).

## Styling and design tokens

- **Tailwind CSS v4** via the `@tailwindcss/vite` plugin. There is no `tailwind.config.js`: configuration lives in `src/index.css`.
- **Design tokens** are CSS variables in `src/index.css`, copied from `docs/06-ui-ux/design-system.md`. Use token classes (`bg-primary`, `hover:bg-primary-hover`, `bg-primary-soft`, `bg-surface`, `text-muted-foreground`, `text-success`, `shadow-card`, `text-h1` …), **never raw hex values** in components. Changing a token means editing `index.css` and the design-system doc in the same PR.
- **Font:** Manrope, self-hosted from `@fontsource-variable/manrope` (one variable file covers weights 200–800).
- **Light theme only.** `dark:` classes in shadcn components never activate (see the `@custom-variant dark` comment in `index.css`).
- **Icons:** `lucide-react`, e.g. `import { ShoppingCart } from "lucide-react"`.
- **Design review page:** http://localhost:5173/design shows every token and core component. It is temporary (remove after the M2-14 design approval).

### shadcn/ui components

shadcn copies component source into `src/components/ui/` (configured by `components.json`); the files are ours to read and edit. Installed: `button`, `badge`, `input`, `label`, `card`, `table`, `sheet`, `sonner`.

Add another component (only when an issue needs it):

```bash
npx shadcn@latest add dialog
```

Local changes from the shadcn defaults, to match the design system:

| File | Change |
|---|---|
| `button.tsx` | `rounded-xl`; primary hover uses `bg-primary-hover` |
| `input.tsx` | `rounded-xl` |
| `card.tsx` | `rounded-2xl` and `shadow-card` |
| `sonner.tsx` | Fixed `theme="light"`; removed the `next-themes` dependency |

`src/lib/utils.ts` re-exports `cn()` (merge Tailwind classes) from the `cn` package published by shadcn.

`npm audit` reports advisories in dev-only packages pulled in by the `shadcn` CLI (`deepmerge`, `minimatch` via `ts-morph`). `npm audit --omit=dev` (what ships to the browser) reports 0. Do not run `npm audit fix --force`; it makes breaking upgrades.

## Folder structure

| Folder | Holds |
|---|---|
| `public/images/{products,banners,categories}` | Static images |
| `src/components/{common,products,cart}` | Reusable UI components |
| `src/pages/{customer,admin}` | Route-level screens |
| `src/layouts` | Page shells (CustomerLayout, AdminLayout) |
| `src/routes` | Route definitions |
| `src/services` | API clients (mock JSON in M2, real HTTP in M3) |
| `src/hooks` | Custom hooks, TanStack Query hooks |
| `src/types` | Shared TypeScript types |
| `src/lib` | Utilities (formatting, `cn()` helper) |
| `src/assets` | Fonts, icons, imported assets |

See `docs/04-architecture/low-level-design.md` and `docs/06-ui-ux/design-system.md`.
