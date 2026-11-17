/**
 * Income tab helpers (#105): periods, change labels, litres. Pure functions, tested in
 * lib/income.test.ts. (Relative ".ts" imports so Node's test runner can load this file.)
 */
import { addDays } from "./subscription.ts"

export type PeriodPreset = "today" | "week" | "month" | "year"
export type Period = { from: string; to: string }

export const PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "year", label: "This year" },
]

/** The dates of a preset, ending today (India time). A week starts on Monday. */
export function presetPeriod(preset: PeriodPreset, today: string): Period {
  if (preset === "today") return { from: today, to: today }
  if (preset === "month") return { from: `${today.slice(0, 7)}-01`, to: today }
  if (preset === "year") return { from: `${today.slice(0, 4)}-01-01`, to: today }
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay() // 0 = Sunday
  return { from: addDays(today, -((weekday + 6) % 7)), to: today }
}

/** Which preset matches a period (to highlight its button), or null for a custom range. */
export function matchPreset(period: Period, today: string): PeriodPreset | null {
  return (
    PRESETS.find((p) => {
      const dates = presetPeriod(p.id, today)
      return dates.from === period.from && dates.to === period.to
    })?.id ?? null
  )
}

/** 8.5 → "+8.5%", -3 → "−3.0%", null → null (nothing to compare with). */
export function changeLabel(change: number | null): string | null {
  if (change === null) return null
  const sign = change > 0 ? "+" : change < 0 ? "−" : ""
  return `${sign}${Math.abs(change).toFixed(1)}%`
}

/** 3580 → "3,580 L", 22.5 → "22.5 L" (Indian digit grouping). */
export function formatLitres(litres: number): string {
  return `${litres.toLocaleString("en-IN", { maximumFractionDigits: 1 })} L`
}

/** "2026-11" → "Nov" ; with the year when asked: "Nov 2026". */
export function monthLabel(month: string, withYear = false): string {
  const date = new Date(`${month}-01T00:00:00Z`)
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: withYear ? "numeric" : undefined,
    timeZone: "UTC",
  }).format(date)
}

/** "2026-11-13" → "13 Nov" (chart axis). */
export function shortDay(day: string): string {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  )
}

/** A chart value back to an API money string: Recharts gives numbers (850, 202.3333),
 *  but formatCurrency only accepts "850.00" (bug fix: the tooltip crashed the page). */
export function chartMoney(value: unknown): string {
  const amount = Number(value)
  return (Number.isFinite(amount) ? amount : 0).toFixed(2)
}

/** 1.40 → "1.4", 16.0 → "16": `digits` decimals without trailing zeros. */
function trimmed(value: number, digits: number): string {
  return String(Number(value.toFixed(digits)))
}

/** Compact money for chart axes: 15820 → "₹16K", 1400 → "₹1.4K", 250000 → "₹2.5L"
 *  (lakh), 900 → "₹900". One decimal below 10K, so nearby ticks do not look the same. */
export function compactRupees(amount: number): string {
  if (amount >= 100_000) return `₹${trimmed(amount / 100_000, amount >= 1_000_000 ? 0 : 1)}L`
  if (amount >= 1_000) return `₹${trimmed(amount / 1_000, amount >= 10_000 ? 0 : 1)}K`
  return `₹${Math.round(amount)}`
}
