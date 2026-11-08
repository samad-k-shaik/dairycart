/**
 * Display formatting helpers.
 * (No `@/` imports here, so Node's built-in test runner can load this file directly.)
 */

/** Indian rupee formatter: ₹ symbol, 2 decimals, Indian digit grouping (₹1,23,456.00). */
const rupeeFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** A money value from the API: digits, a dot, exactly 2 decimals ("60.00"). */
const MONEY_PATTERN = /^\d+\.\d{2}$/

/**
 * Formats an API money string for display: "60.00" → "₹60.00", "155.00" → "₹155.00".
 *
 * The string is passed to Intl as-is. Modern Intl formats numeric strings exactly
 * (it does not convert them to a floating-point number first), so no rounding occurs.
 * Throws on anything that is not an API money string, to surface bugs early.
 */
export function formatCurrency(amount: string): string {
  if (!MONEY_PATTERN.test(amount)) {
    throw new TypeError(`formatCurrency expects a money string like "60.00", got "${amount}"`)
  }
  // The cast tells TypeScript this string is numeric (we just checked it with the pattern).
  return rupeeFormatter.format(amount as `${number}`)
}
