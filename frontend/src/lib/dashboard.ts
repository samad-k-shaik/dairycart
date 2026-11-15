/**
 * Dashboard helpers (FR-A1). Pure functions, unit-tested in dashboard.test.ts.
 * (Relative ".ts" imports so Node's test runner can load this file.)
 */
import type { OrderStatus } from "../types/order.ts"
import { istDateKey } from "./format.ts"

/** Total orders = sum of the per-status counts from the API. */
export function totalFromStatusCounts(counts: Record<OrderStatus, number>): number {
  return Object.values(counts).reduce((sum, n) => sum + n, 0)
}

/**
 * How many orders were placed "today" in India (IST), not UTC.
 * Example: 2026-11-07T19:00:00Z is 8 Nov 00:30 IST, so it counts for 8 Nov.
 */
export function countOrdersOnIstDay(orders: { order_date: string }[], now: Date = new Date()): number {
  const today = istDateKey(now)
  return orders.filter((order) => istDateKey(order.order_date) === today).length
}
