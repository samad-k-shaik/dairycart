/**
 * Display formatting helpers (pure functions: same input → same output, no side effects).
 *
 * Pages call these instead of formatting inline, so every screen shows money
 * and dates the same way, and the rules can be unit-tested (format.test.ts).
 */

/** Built once and reused: creating Intl formatters is relatively expensive. */
const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * formatCurrency("60.00") → "₹60.00", formatCurrency("1500.00") → "₹1,500.00".
 * `en-IN` uses Indian digit grouping (₹1,00,000.00).
 * Converting to Number here is safe because it is ONLY for display, never for maths
 * (maths happens in src/lib/money.ts using integer paise).
 */
export function formatCurrency(amount: string): string {
  return currencyFormatter.format(Number(amount))
}

/**
 * The API sends dates in UTC ("2026-11-07T04:30:00Z"). Our customers are in India,
 * so we always DISPLAY them in India Standard Time (Asia/Kolkata, UTC+5:30),
 * no matter which time zone the viewer's computer uses.
 */
const IST = 'Asia/Kolkata'

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

/** "2026-11-07T04:30:00Z" → "7 Nov 2026, 10:00 am" (IST). */
export function formatDateTime(isoDate: string): string {
  return dateTimeFormatter.format(new Date(isoDate))
}

/** The calendar date in IST as "YYYY-MM-DD" (the en-CA locale prints dates in that order). */
function istDateKey(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: IST })
}

/**
 * Was this order placed "today" in India? Used by the admin dashboard.
 * Example: 2026-11-07T20:00:00Z is already 8 Nov at 01:30 IST, so it counts as 8 Nov.
 * `now` is a parameter so tests can pass a fixed date.
 */
export function isTodayInIST(isoDate: string, now: Date = new Date()): boolean {
  return istDateKey(new Date(isoDate)) === istDateKey(now)
}

/** Order ids are shown as "#101" everywhere. */
export function formatOrderId(orderId: number): string {
  return `#${orderId}`
}
