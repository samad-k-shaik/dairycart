/**
 * Entry point: index.html loads this file, and this file mounts React into <div id="root">.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
// `@/` is our path alias for `src/` (see tsconfig.app.json and vite.config.ts).
import App from '@/App.tsx'

// The `!` tells TypeScript "this element definitely exists" (it is in index.html).
// StrictMode runs extra development-only checks to catch common React mistakes.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
