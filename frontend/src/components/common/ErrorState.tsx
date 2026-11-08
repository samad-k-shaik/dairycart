/**
 * ErrorState – shown when a request FAILED (#32).
 *
 * - Shows only a safe, human-readable message (`getErrorMessage`), never raw
 *   technical details like stack traces.
 * - "Try again" calls `onRetry`, which pages wire to TanStack Query's `refetch()`,
 *   so the same request simply runs again.
 */
import { AlertTriangle, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/services/apiError'

interface ErrorStateProps {
  error: unknown
  onRetry?: () => void
  title?: string
  className?: string
}

export function ErrorState({ error, onRetry, title = 'We could not load this', className }: ErrorStateProps) {
  return (
    <div
      role="alert" // screen readers announce errors immediately
      className={cn(
        'flex flex-col items-center gap-3 rounded-2xl border border-red-100 bg-red-50/60 px-6 py-10 text-center',
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-red-100 text-danger">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </div>
      <h2 className="text-base font-bold">{title}</h2>
      <p className="max-w-sm text-muted-foreground">{getErrorMessage(error)}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="mt-1">
          <RotateCw aria-hidden="true" />
          Try again
        </Button>
      )}
    </div>
  )
}
