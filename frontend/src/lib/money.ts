/**
 * Money arithmetic without floating-point errors.
 *
 * PROBLEM: JavaScript numbers are binary floating point.
 *   0.1 + 0.2        → 0.30000000000000004
 *   0.29 * 100       → 28.999999999999996
 * For money that is unacceptable.
 *
 * SOLUTION: convert "60.00" rupees into whole PAISE (1 rupee = 100 paise) as an
 * integer (6000), do all maths on integers (exact), and convert back to a
 * "60.00" string only for display.
 *
 * IMPORTANT: the frontend only calculates an ESTIMATED cart total for display.
 * The real total is always calculated by the backend from database prices.
 */

/** "60.00" → 6000. Parses the string by hand instead of multiplying a float. */
export function toPaise(amount: string): number {
  const match = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(amount.trim())
  if (!match) {
    throw new Error(`Invalid money amount: "${amount}"`)
  }
  const [, minus, rupees, decimals = ''] = match
  // padEnd turns ".5" into "50" so "60.5" means 60 rupees 50 paise.
  const paise = Number(rupees) * 100 + Number(decimals.padEnd(2, '0'))
  return minus ? -paise : paise
}

/** 6000 → "60.00". Same shape the API uses, so it can go straight into formatCurrency(). */
export function fromPaise(paise: number): string {
  const sign = paise < 0 ? '-' : ''
  const abs = Math.abs(paise)
  const rupees = Math.floor(abs / 100)
  const rest = String(abs % 100).padStart(2, '0')
  return `${sign}${rupees}.${rest}`
}

/** price × quantity, e.g. multiplyMoney("60.00", 3) → "180.00". */
export function multiplyMoney(price: string, quantity: number): string {
  return fromPaise(toPaise(price) * quantity)
}

/** Adds money strings, e.g. sumMoney(["120.00", "35.00"]) → "155.00". */
export function sumMoney(amounts: string[]): string {
  return fromPaise(amounts.reduce((total, amount) => total + toPaise(amount), 0))
}
