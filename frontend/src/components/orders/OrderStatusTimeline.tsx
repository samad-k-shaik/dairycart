/**
 * OrderStatusTimeline: Placed → Confirmed → Out for delivery → Delivered,
 * or Placed → Cancelled. The steps come from getTimelineSteps() (unit-tested).
 */
import { Check, X } from "lucide-react"

import { getTimelineSteps, type TimelineStepState } from "@/lib/orderStatus"
import { cn } from "@/lib/utils"
import type { OrderStatus } from "@/types/order"

const DOT: Record<TimelineStepState, string> = {
  done: "bg-success text-white",
  current: "bg-surface text-primary ring-4 ring-primary-soft border-2 border-primary",
  upcoming: "bg-muted text-muted-foreground",
  cancelled: "bg-danger text-white",
}

const STATE_TEXT: Record<TimelineStepState, string> = {
  done: "completed",
  current: "current status",
  upcoming: "not yet",
  cancelled: "order cancelled",
}

export function OrderStatusTimeline({ status }: { status: OrderStatus }) {
  const steps = getTimelineSteps(status)
  const delivered = status === "DELIVERED"

  return (
    <ol className="space-y-0" aria-label="Order progress">
      {steps.map((step, index) => {
        const last = index === steps.length - 1
        // A delivered order's final step is shown as completed (green), not "in progress".
        const state: TimelineStepState = delivered && step.state === "current" ? "done" : step.state
        return (
          <li
            key={step.status}
            className="relative flex gap-3 pb-6 last:pb-0"
            aria-current={step.state === "current" || step.state === "cancelled" ? "step" : undefined}
          >
            {!last && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-8 left-[15px] h-[calc(100%-2rem)] w-0.5",
                  step.state === "done" ? "bg-success" : "bg-border",
                )}
              />
            )}
            <span
              aria-hidden="true"
              className={cn("relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full", DOT[state])}
            >
              {state === "done" && <Check className="size-4" />}
              {state === "cancelled" && <X className="size-4" />}
              {state === "current" && <span className="size-2.5 rounded-full bg-primary" />}
            </span>
            <div className="pt-1">
              <p
                className={cn(
                  "font-semibold",
                  state === "upcoming" && "text-muted-foreground",
                  state === "cancelled" && "text-danger",
                )}
              >
                {step.label}
              </p>
              <p className="sr-only">{STATE_TEXT[step.state]}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
