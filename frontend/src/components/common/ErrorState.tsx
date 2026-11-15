/**
 * ErrorState: loading FAILED. Shows a plain-language message and a Retry button
 * that re-runs the query. (Different from EmptyState: there may be data, we just
 * could not get it.)
 *
 * Messages come from the API error's `message` (written for people). Anything else
 * (network failure, a bug) gets a generic message: never show raw technical errors.
 */
import { AlertTriangle, Loader2, RotateCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ServiceError } from "@/services/serviceError"
import { cn } from "@/lib/utils"

type ErrorStateProps = {
  /** What failed, e.g. "We could not load the products." */
  title: string
  error?: unknown
  /** Re-runs the query (e.g. refetch from useQuery). */
  onRetry?: () => void
  /** True while the retry is running, to disable the button. */
  retrying?: boolean
  className?: string
}

export function userFacingMessage(error: unknown): string {
  if (error instanceof ServiceError) return error.message
  return "Please check your connection and try again."
}

export function ErrorState({ title, error, onRetry, retrying = false, className }: ErrorStateProps) {
  return (
    <section
      role="alert"
      className={cn("flex flex-col items-center gap-3 rounded-2xl bg-surface px-4 py-10 text-center shadow-card", className)}
    >
      <span className="flex size-16 items-center justify-center rounded-full bg-red-50 text-danger">
        <AlertTriangle className="size-8" aria-hidden="true" />
      </span>
      <h2 className="text-h2 font-bold">{title}</h2>
      <p className="max-w-sm text-muted-foreground">{userFacingMessage(error)}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} disabled={retrying}>
          {retrying ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RotateCw aria-hidden="true" />}
          {retrying ? "Retrying…" : "Retry"}
        </Button>
      )}
    </section>
  )
}
