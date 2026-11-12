/**
 * Subscription helpers (#97): plans, dates and display estimates. Pure functions, so
 * Node's test runner can check them (lib/subscription.test.ts).
 *
 * Dates are calendar days as "YYYY-MM-DD" strings, in INDIA time (the backend uses the
 * same "today"). Money here is only a display ESTIMATE: the backend calculates the real
 * daily and plan totals and locks the prices when the user subscribes.
 * (Relative ".ts" imports so Node's test runner can load this file.)
 */
import type {
  CreateSubscriptionRequest,
  IsoDate,
  SubscriptionPlan,
  SubscriptionStatus,
} from "../types/subscription.ts"
import { fromPaise, toPaise } from "./money.ts"

export const PLAN_OPTIONS: { plan: SubscriptionPlan; days: number; label: string }[] = [
  { plan: "WEEK", days: 7, label: "1 week" },
  { plan: "HALF_MONTH", days: 15, label: "15 days" },
  { plan: "MONTH", days: 30, label: "1 month" },
]

/** How far ahead a subscription may start (same rule as the backend). */
export const MAX_DAYS_AHEAD = 30

export function planDays(plan: SubscriptionPlan): number {
  return PLAN_OPTIONS.find((option) => option.plan === plan)?.days ?? 0
}

export function planLabel(plan: SubscriptionPlan): string {
  return PLAN_OPTIONS.find((option) => option.plan === plan)?.label ?? plan
}

// en-CA formats dates as YYYY-MM-DD; the time zone makes it India's calendar day.
const indiaDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

/** Today in India, e.g. "2026-11-20". `now` is a parameter so tests can fix the time. */
export function todayInIndia(now: Date = new Date()): IsoDate {
  return indiaDay.format(now)
}

/** "2026-11-30" + 2 → "2026-12-02". Calculated in UTC, so no daylight-saving surprises. */
export function addDays(day: IsoDate, days: number): IsoDate {
  const [year, month, date] = day.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, date + days)).toISOString().slice(0, 10)
}

/** The earliest and latest allowed start dates: tomorrow … 30 days from today. */
export function startDateRange(now: Date = new Date()): { min: IsoDate; max: IsoDate } {
  const today = todayInIndia(now)
  return { min: addDays(today, 1), max: addDays(today, MAX_DAYS_AHEAD) }
}

/** The last delivery day, included: 7 days from the 21st → the 27th. */
export function endDateFor(start: IsoDate, plan: SubscriptionPlan): IsoDate {
  return addDays(start, planDays(plan) - 1)
}

/** "" if fine, otherwise the message to show under the start date field. */
export function validateStartDate(start: string, now: Date = new Date()): string {
  const { min, max } = startDateRange(now)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return "Choose a start date."
  // YYYY-MM-DD strings sort like dates, so plain string comparison works.
  if (start < min) return "The first delivery can be tomorrow at the earliest."
  if (start > max) return `Start within the next ${MAX_DAYS_AHEAD} days.`
  return ""
}

const dayFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "UTC", // the string is already a calendar day; do not shift it
  day: "numeric",
  month: "short",
  year: "numeric",
})

/** "2026-11-21" → "21 Nov 2026". */
export function formatDay(day: IsoDate): string {
  return dayFormatter.format(new Date(`${day}T00:00:00Z`))
}

/** Estimated plan total for the checkout summary: "120.00" × 7 → "840.00". */
export function estimatePlanTotal(dailyTotal: string, plan: SubscriptionPlan): string {
  return fromPaise(toPaise(dailyTotal) * planDays(plan))
}

export const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  ACTIVE: "Active",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
}

/** POST /subscriptions body: only plan, start date, contact, ids and quantities. */
export function buildCreateSubscriptionRequest(
  plan: SubscriptionPlan,
  startDate: IsoDate,
  customer: { name: string; phone: string },
  lines: { product_id: number; quantity: number }[],
): CreateSubscriptionRequest {
  return {
    plan,
    start_date: startDate,
    customer: { name: customer.name.trim(), phone: customer.phone },
    // Only the two allowed fields, so cart fields (name, size, price) never leak in.
    items: lines.map(({ product_id, quantity }) => ({ product_id, quantity })),
  }
}
