/**
 * Entry point – the first file the browser runs (index.html loads it).
 *
 * It finds <div id="root"> in index.html and tells React to render <App /> inside it.
 * Global CSS (Tailwind + design tokens) is imported once here.
 *
 * <StrictMode> is a development helper: it runs some code twice on purpose to
 * reveal bugs early. It does nothing in the production build.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from '@/App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
