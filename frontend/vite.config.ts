/**
 * Vite configuration: how the dev server and the production build work.
 *
 * Vite is the build tool. In development (`npm run dev`) it serves our source
 * files directly and hot-reloads the browser on save. For production
 * (`npm run build`) it bundles and minifies everything into `dist/`.
 */
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Compiles JSX/TSX and enables "fast refresh" (keeps component state on save).
    react(),
    // Tailwind CSS v4: scans our files for class names like `bg-primary`
    // and generates only the CSS we actually use.
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // `@/lib/format` → `src/lib/format`. Must match "paths" in tsconfig.app.json.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // The backend's CORS settings (M3) expect the frontend on 5173.
    // strictPort makes Vite fail loudly instead of silently switching to 5174.
    port: 5173,
    strictPort: true,
  },
  test: {
    // Vitest (ADR-009) reuses this config, so the `@/` alias works in tests too.
    // Only plain logic is unit-tested in M2; component tests come with M4 (#404).
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
