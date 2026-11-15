/**
 * AppErrorFallback: shown when a component crashes (a bug), instead of a blank page.
 * Used by the top-level ErrorBoundary and by React Router's errorElement.
 * Customers see plain words; technical details only appear in development.
 */
import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"

export function AppErrorFallback({ error }: { error: unknown }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <section
        role="alert"
        className="flex max-w-md flex-col items-center gap-4 rounded-2xl bg-surface p-8 text-center shadow-card"
      >
        <span className="flex size-16 items-center justify-center rounded-full bg-red-50 text-danger">
          <AlertTriangle className="size-8" aria-hidden="true" />
        </span>
        <h1 className="text-h1 font-bold">Something went wrong</h1>
        <p className="text-muted-foreground">
          Sorry, this page stopped working. Your cart is saved. Reload the page or go back to the shop.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => window.location.reload()}>Reload page</Button>
          {/* A full page load (not client navigation) resets the broken state. */}
          <Button variant="outline" onClick={() => window.location.assign("/")}>
            Go to the shop
          </Button>
        </div>
        {import.meta.env.DEV && (
          <details className="w-full text-left text-small text-muted-foreground">
            <summary className="cursor-pointer">Technical details (development only)</summary>
            <pre className="mt-2 overflow-auto rounded-xl bg-muted p-3 whitespace-pre-wrap">
              {error instanceof Error ? `${error.name}: ${error.message}` : String(error)}
            </pre>
          </details>
        )}
      </section>
    </main>
  )
}
