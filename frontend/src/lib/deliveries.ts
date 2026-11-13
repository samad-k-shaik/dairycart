/**
 * Helpers for the admin Deliveries and user pages (#101). Pure functions, tested in
 * lib/deliveries.test.ts. (Relative ".ts" imports so Node's test runner can load this.)
 */
import type { DeliveryItem } from "../types/delivery.ts"
import { addDays, formatDay } from "./subscription.ts"

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** A "?date=" value we can use, or null (missing, wrong format or not a real day). */
export function readDate(value: string | null): string | null {
  if (!value || !DATE_PATTERN.test(value)) return null
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null
}

/** "Today", "Tomorrow", "Yesterday", or "Mon, 16 Nov 2026". */
export function dayLabel(day: string, today: string): string {
  if (day === today) return "Today"
  if (day === addDays(today, 1)) return "Tomorrow"
  if (day === addDays(today, -1)) return "Yesterday"
  const weekday = new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  )
  return `${weekday}, ${formatDay(day)}`
}

/** "2 × Cow Milk 1 Litre" */
export function itemLabel(item: DeliveryItem): string {
  return `${item.quantity} × ${item.product_name} ${item.size}`
}
