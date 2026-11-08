# frontend/

React + Vite + TypeScript application containing both the **customer** and **admin** UIs (separate route trees, one app).

The Vite project was scaffolded in M2-01 (#20). Tailwind CSS and shadcn/ui come in M2-02 (#21) and routing in M2-04 (#23). Empty folders keep a `.gitkeep` placeholder so the agreed structure is visible.

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
- Import from `src/` with the `@/` alias, e.g. `import App from '@/App.tsx'`. The alias is defined in both `tsconfig.app.json` (`paths`) and `vite.config.ts` (`resolve.alias`); keep them in sync.

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
