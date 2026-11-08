/**
 * OrderStatusTimeline – visual progress of an order (#29):
 *
 *   ● Placed ── ● Confirmed ── ○ Out for delivery ── ○ Delivered
 *
 * - Steps up to and including the current status are "done" (filled).
 * - The current step is highlighted.
 * - A CANCELLED order shows a red "Cancelled" message instead, because it
 *   left the normal path (we cannot know from the API at which step it stopped).
 *
 * Rendered as an ordered list (<ol>) so screen readers announce "step 2 of 4".
 */
import { Check, XCircle } from 'lucide-react'
import { STATUS_LABELS, TIMELINE_STEPS } from '@/lib/orderStatus'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/types/order'

export function OrderStatusTimeline({ status }: { status: OrderStatus }) {
  if (status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-red-50 px-4 py-3 text-red-700">
        <XCircle className="size-5 shrink-0" aria-hidden="true" />
        <p className="font-semibold">This order was cancelled.</p>
      </div>
    )
  }

  const currentIndex = TIMELINE_STEPS.indexOf(status)

  return (
    <ol className="flex flex-col gap-0 sm:flex-row sm:items-start">
      {TIMELINE_STEPS.map((step, index) => {
        const done = index <= currentIndex
        const isCurrent = index === currentIndex
        const isLast = index === TIMELINE_STEPS.length - 1
        return (
          <li
            key={step}
            className="relative flex gap-3 pb-5 last:pb-0 sm:flex-1 sm:flex-col sm:items-center sm:gap-2 sm:pb-0 sm:text-center"
            aria-current={isCurrent ? 'step' : undefined}
          >
            {/* Connector line to the next step: vertical on mobile, horizontal on desktop. */}
            {!isLast && (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute top-8 left-[15px] h-[calc(100%-2rem)] w-0.5 sm:top-[15px] sm:left-[calc(50%+1rem)] sm:h-0.5 sm:w-[calc(100%-2rem)]',
                  index < currentIndex ? 'bg-primary' : 'bg-border',
                )}
              />
            )}
            <span
              className={cn(
                'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2',
                done ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-surface text-muted-foreground',
                isCurrent && 'ring-4 ring-primary-soft',
              )}
            >
              {done ? <Check className="size-4" aria-hidden="true" /> : <span className="text-xs font-bold">{index + 1}</span>}
            </span>
            <span className={cn('pt-1 text-sm sm:pt-0', isCurrent ? 'font-bold text-foreground' : done ? 'font-semibold' : 'text-muted-foreground')}>
              {STATUS_LABELS[step]}
              <span className="sr-only">{done ? ' (completed)' : ' (pending)'}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
