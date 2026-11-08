/**
 * AppErrorFallback – the full-page "Something went wrong" screen.
 *
 * Shown by <ErrorBoundary> and by the router's `errorElement` when a page
 * crashes while rendering. Uses a plain <a href="/"> (full reload) on purpose:
 * after a crash, starting the app fresh is the safest recovery.
 */
import { Milk } from 'lucide-react'

export function AppErrorFallback() {
  return (
    <div role="alert" className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Milk className="size-8" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="max-w-sm text-muted-foreground">
        An unexpected error occurred. Your cart is saved. Please reload the page to continue.
      </p>
      <a
        href="/"
        className="inline-flex h-11 items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary-hover"
      >
        Back to home
      </a>
    </div>
  )
}
