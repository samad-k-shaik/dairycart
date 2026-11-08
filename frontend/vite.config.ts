/**
 * Vite configuration: how the dev server and the production build work.
 *
 * - `npm run dev`   → Vite serves our source files and hot-reloads the browser on save.
 * - `npm run build` → Vite bundles and minifies everything into `dist/` for deployment.
 */
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Compiles JSX/TSX and enables "fast refresh" (keeps component state on save).
  plugins: [react()],
  resolve: {
    alias: {
      // `@/lib/format` → `src/lib/format`. Must match "paths" in tsconfig.app.json.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // The issue and the backend's future CORS settings (M3) expect port 5173.
    // strictPort makes Vite fail loudly instead of silently switching to 5174.
    port: 5173,
    strictPort: true,
  },
})
