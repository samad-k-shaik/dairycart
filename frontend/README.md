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

`typecheck` uses `tsc -b` rather than `tsc --noEmit`: the root `tsconfig.json` only references `tsconfig.app.json` (app code) and `tsconfig.node.json` (`vite.config.ts`), so plain `tsc --noEmit` would check no files. Both referenced configs set `noEmit`, so nothing is written.

## Conventions

- TypeScript **strict mode** is on (`tsconfig.app.json`).
- Import from `src/` with the `@/` alias, e.g. `import App from '@/App.tsx'`. The alias is defined in `tsconfig.json` and `tsconfig.app.json` (`paths`, the shadcn CLI reads the root one) and in `vite.config.ts` (`resolve.alias`); keep them in sync.

## Styling and design tokens

- **Tailwind CSS v4** via the `@tailwindcss/vite` plugin. There is no `tailwind.config.js`: configuration lives in `src/index.css`.
- **Design tokens** are CSS variables in `src/index.css`, copied from `docs/06-ui-ux/design-system.md`. Use token classes (`bg-primary`, `hover:bg-primary-hover`, `bg-primary-soft`, `bg-surface`, `text-muted-foreground`, `text-success`, `shadow-card`, `text-h1` …), **never raw hex values** in components. Changing a token means editing `index.css` and the design-system doc in the same PR.
- **Font:** Manrope, self-hosted from `@fontsource-variable/manrope` (one variable file covers weights 200–800).
- **Light theme only.** `dark:` classes in shadcn components never activate (see the `@custom-variant dark` comment in `index.css`).
- **Icons:** `lucide-react`, e.g. `import { ShoppingCart } from "lucide-react"`.
- **Design review page:** http://localhost:5173/design shows every token and core component. It is temporary (remove after the M2-14 design approval); until routing exists (M2-04) `App.tsx` picks it by checking the URL.

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
