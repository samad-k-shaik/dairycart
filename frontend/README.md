# frontend/

React + Vite + TypeScript application containing both the **customer** and **admin** UIs (separate route trees, one app).

Not scaffolded yet: the Vite project (`package.json`, `src/App.tsx`, `src/main.tsx`, Tailwind and shadcn/ui setup) is created by the first **M2 – Frontend Foundation** issue. Folders exist with `.gitkeep` placeholders so the agreed structure is visible.

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
