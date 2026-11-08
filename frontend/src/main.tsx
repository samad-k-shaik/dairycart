/**
 * Entry point: index.html loads this file, and this file mounts React into <div id="root">.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import '@/index.css'
// `@/` is our path alias for `src/` (see tsconfig.app.json and vite.config.ts).
import App from '@/App.tsx'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { queryClient } from '@/lib/queryClient'

// The `!` tells TypeScript "this element definitely exists" (it is in index.html).
// StrictMode runs extra development-only checks to catch common React mistakes.
// ErrorBoundary: a crash anywhere below shows a friendly page instead of a blank screen.
// QueryClientProvider makes TanStack Query (useQuery) available to every component.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
