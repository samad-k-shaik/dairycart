/**
 * Order status rules – the ONE place the frontend knows the status lifecycle.
 *
 * Source: docs/03-requirements/functional-requirements.md → "Order status lifecycle".
 *
 *   PLACED ──► CONFIRMED ──► OUT_FOR_DELIVERY ──► DELIVERED
 *     │            │
 *     └────────────┴──► CANCELLED
 *
 * WHY a single shared constant? The admin status dropdown, the customer
 * timeline and the mock service all need these rules. Writing them once avoids
 * three copies drifting apart.
 *
 * NOTE: the backend ALSO enforces these rules (M3, #306). The UI restriction is
 * only for usability; it is never trusted for security.
 */
import type { OrderStatus } from '@/types/order'

/** Every status, in lifecycle order. Useful for filters and dashboard cards. */
export const ORDER_STATUSES: readonly OrderStatus[] = [
  'PLACED',
  'CONFIRMED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
]

/** Which statuses each status may move to. Empty list = final status. */
export const ALLOWED_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  PLACED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
}

/** Statuses the admin dropdown should offer for an order currently in `status`. */
export function getNextStatuses(status: OrderStatus): readonly OrderStatus[] {
  return ALLOWED_TRANSITIONS[status]
}

/** true if `from → to` is allowed, e.g. canTransition('PLACED', 'CONFIRMED') → true. */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to)
}

/** DELIVERED and CANCELLED cannot change any more. */
export function isFinalStatus(status: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0
}

/** Human-friendly labels: the API value 'OUT_FOR_DELIVERY' is shown as "Out for delivery". */
export const STATUS_LABELS: Readonly<Record<OrderStatus, string>> = {
  PLACED: 'Placed',
  CONFIRMED: 'Confirmed',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

/** The "happy path" shown in the customer's timeline. CANCELLED is drawn separately. */
export const TIMELINE_STEPS: readonly OrderStatus[] = [
  'PLACED',
  'CONFIRMED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
]

/** Type guard: checks an untrusted string (e.g. from the URL ?status=) is a real status. */
export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && (ORDER_STATUSES as readonly string[]).includes(value)
}
