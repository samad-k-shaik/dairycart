/**
 * Vite configuration: how the dev server and the production build work.
 *
 * - `npm run dev`   → Vite serves our source files and hot-reloads the browser on save.
 * - `npm run build` → Vite bundles and minifies everything into `dist/` for deployment.
 * - `npm test`      → Vitest runs the tests with the same settings (aliases, plugins) (#49).
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
  test: {
    // jsdom: a browser simulated in Node, so components can render (document, window…).
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Leaflet's CSS and our CSS files are not needed to test behaviour.
    css: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/services/mock/**', 'src/main.tsx'],
      reporter: ['text-summary', 'html'],
    },
  },
  server: {
    // The issue and the backend's future CORS settings (M3) expect port 5173.
    // strictPort makes Vite fail loudly instead of silently switching to 5174.
    port: 5173,
    strictPort: true,
  },
})
