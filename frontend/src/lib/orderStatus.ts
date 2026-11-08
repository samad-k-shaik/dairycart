/**
 * Order status display helpers: friendly labels and the customer timeline.
 * (Relative ".ts" imports so Node's test runner can load this file.)
 */
import type { OrderStatus } from "../types/order.ts"

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PLACED: "Placed",
  CONFIRMED: "Confirmed",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
}

/**
 * THE single source of allowed status changes, copied from the "Order status lifecycle"
 * table in docs/03-requirements/functional-requirements.md. DELIVERED and CANCELLED are final.
 *
 * Used by the admin status dropdown (only valid choices are offered) AND by the mock
 * order service (rejects invalid changes with 409), so the two can never disagree.
 * The real backend enforces the same rules (M3); the UI check is for usability only.
 */
export const ALLOWED_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  PLACED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
}

/** Statuses an order may move to next (empty for final statuses). */
export function getNextStatuses(status: OrderStatus): readonly OrderStatus[] {
  return ALLOWED_TRANSITIONS[status]
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to)
}

/** DELIVERED and CANCELLED: no further changes. */
export function isFinalStatus(status: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0
}

/** The normal delivery path, in order. CANCELLED is not on it. */
const DELIVERY_PATH: OrderStatus[] = ["PLACED", "CONFIRMED", "OUT_FOR_DELIVERY", "DELIVERED"]

export type TimelineStepState = "done" | "current" | "upcoming" | "cancelled"

export type TimelineStep = {
  status: OrderStatus
  label: string
  state: TimelineStepState
}

/**
 * Steps to draw for an order's timeline.
 *
 * Normal orders: steps before the current status are "done", the current one is
 * "current" (DELIVERED counts as current: it is the final, reached step), later ones are "upcoming".
 *
 * Cancelled orders: the API only tells us the order is CANCELLED now, not at which step
 * it was cancelled (no status history). A cancel is only allowed from PLACED or CONFIRMED,
 * and every order starts as PLACED, so we show "Placed" as done followed by "Cancelled",
 * and do not show delivery steps that will never happen.
 */
export function getTimelineSteps(status: OrderStatus): TimelineStep[] {
  if (status === "CANCELLED") {
    return [
      { status: "PLACED", label: STATUS_LABELS.PLACED, state: "done" },
      { status: "CANCELLED", label: STATUS_LABELS.CANCELLED, state: "cancelled" },
    ]
  }
  const currentIndex = DELIVERY_PATH.indexOf(status)
  return DELIVERY_PATH.map((step, index) => ({
    status: step,
    label: STATUS_LABELS[step],
    state: index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming",
  }))
}
