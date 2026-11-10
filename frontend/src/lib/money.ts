/**
 * Money maths for DISPLAY ESTIMATES only (e.g. "₹120.00" on the Add to cart button).
 * The backend calculates real prices and totals; the frontend never sends them.
 *
 * Works in whole paise (₹60.00 = 6000) so there are no floating-point errors.
 */

/** "60.00" → 6000 */
export function toPaise(amount: string): number {
  const [rupees, paise = "00"] = amount.split(".")
  return Number(rupees) * 100 + Number(paise.padEnd(2, "0").slice(0, 2))
}

/** 12000 → "120.00" */
export function fromPaise(paise: number): string {
  return `${Math.floor(paise / 100)}.${String(paise % 100).padStart(2, "0")}`
}

/** "60.00" × 2 → "120.00" */
export function multiplyMoney(amount: string, quantity: number): string {
  return fromPaise(toPaise(amount) * quantity)
}
