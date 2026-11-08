# frontend/

React + Vite + TypeScript application containing both the **customer** and **admin** UIs (separate route trees, one app).

> **M2 status:** every screen runs on **mock data** (`src/services/mock/`). No backend is needed. M3 swaps the mock services for real HTTP calls without changing pages or hooks.

## Setup

**Prerequisites:** Node.js 20 LTS or newer (`node --version`). Verified with Node 24.

```bash
cd frontend
npm install        # install exact versions from package-lock.json
npm run dev        # start the dev server → http://localhost:5173
```

The dev server uses port **5173** with `strictPort`: if the port is busy, Vite stops with an error instead of switching to another port (the backend's CORS settings expect 5173).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload (changes appear in the browser instantly) |
| `npm run build` | Type-checks, then builds an optimised production bundle into `dist/` |
| `npm run preview` | Serves the `dist/` build locally to check the production version |
| `npm run typecheck` | Type-checks all TypeScript without building (`tsc -b`) |
| `npm test` | Runs the unit tests once with Vitest (`src/**/*.test.ts`) |

`typecheck` uses `tsc -b`, not `tsc --noEmit`: the root `tsconfig.json` only *references* `tsconfig.app.json` (app code) and `tsconfig.node.json` (`vite.config.ts`), so plain `tsc --noEmit` checks zero files and always passes. `tsc -b` follows the references; both configs set `noEmit`, so no files are written.

## Screens (routes)

| URL | Page | Requirement |
|---|---|---|
| `/` | Home: hero, Cow/Buffalo chips, product grid | FR-C1 |
| `/products/:id` | Product details + quantity selector | FR-C2, FR-C3 |
| `/cart` | Cart with quantity edit / remove, estimated total | FR-C4 |
| `/checkout` | Name + mobile form, order summary | FR-C5 |
| `/orders/:id/confirmation` | Order confirmation (backend total, price-change notice) | FR-C6, FR-C8 |
| `/orders?phone=…` | Order history lookup | FR-C7 |
| `/orders/:id` | Order details with status timeline | FR-C7 |
| `/admin` | Dashboard: total, today, per-status counts, recent orders | FR-A1 |
| `/admin/orders` | Orders table: status filter, pagination, details sheet, status update | FR-A2–A4 |
| `/admin/products` | Read-only products table incl. unavailable | FR-A5 |
| `/design` | **Temporary** style guide for the design review; remove after M2 approval | #21 |

## Mock data (M2 only)

- Seed data: `src/services/mock/products.json` (4 seed products + 1 unavailable) and `orders.json` (10 orders across all statuses).
- New orders and status changes are saved in `localStorage` (`milk-mock-db-v1`), so the customer → admin → customer flow can be demonstrated.
- **Dev switch** (bottom-right, only in `npm run dev`): set the mock API to *Normal*, *Slow* (2.5 s) or *Error* to check loading skeletons and error states, or *Reset mock data*.
- Product images and descriptions are not in the API contract; they live in `src/lib/productDisplay.ts` (display only). Image sources: `public/images/README.md`.

## Configuration

- **TypeScript strict mode** is enabled in `tsconfig.app.json`.
- **Path alias** `@/` → `src/`, e.g. `import App from '@/App.tsx'`. Defined in `tsconfig.json` + `tsconfig.app.json` (`paths`, for TypeScript and the shadcn CLI) and `vite.config.ts` (`resolve.alias`, for Vite and Vitest). Keep them in sync.
- **Design tokens** (colours, Manrope, shadow) live in `src/index.css`; source of truth is `docs/06-ui-ux/design-system.md`.
- **shadcn/ui**: `components.json` configures the CLI. Add a component with `npx shadcn@latest add <name>`; it is copied into `src/components/ui/`. Our copies were adjusted to the design system (button/input sizes, card radius). The CLI's `cn` package was replaced by the common `clsx` + `tailwind-merge` helper in `src/lib/utils.ts`.
- Linting (ESLint + Prettier) is added in M4 (#407).

## Folder structure

| Folder | Holds |
|---|---|
| `public/images/products` | Product images (original SVGs, see `public/images/README.md`) |
| `src/components/ui` | shadcn/ui building blocks (Button, Card, Input, Sheet, Table…) |
| `src/components/common` | Shared app components (QuantitySelector, StatusBadge, EmptyState, ErrorState, ErrorBoundary…) |
| `src/components/{products,cart,orders,admin}` | Feature components |
| `src/pages/{customer,admin}` | Route-level screens |
| `src/layouts` | Page shells (CustomerLayout, AdminLayout) |
| `src/routes` | Route definitions (`router.tsx`) |
| `src/services` | Data access: `productService`, `orderService` (mock JSON in M2, real HTTP in M3) |
| `src/hooks` | TanStack Query hooks, cart (`useCart`, `cart/` reducer + provider) |
| `src/types` | Shared TypeScript types mirroring the API contract |
| `src/lib` | Pure helpers: formatting, money in paise, order status rules, validation, `cn()` |

Data flow: **page → hook → service → (mock DB in M2 / HTTP in M3)**. Pages never import mock data directly.

Entry points: `index.html` → `src/main.tsx` → `src/App.tsx` (providers) → `src/routes/router.tsx`.

See `docs/04-architecture/low-level-design.md` and `docs/06-ui-ux/design-system.md`.
