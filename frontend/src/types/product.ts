/**
 * Product types – mirror `GET /api/v1/products` in docs/05-api/api-contracts.md.
 *
 * WHY mirror the contract exactly (snake_case, money as string)?
 * In M2 the data comes from mock JSON; in M3 it comes from the real backend.
 * If our types already match the real API field-for-field, switching is a
 * small change in `src/services/` and no page has to be rewritten.
 */

/** One product exactly as the API returns it. */
export interface Product {
  product_id: number
  name: string // e.g. "Cow Milk"
  size: string // e.g. "500 ml"
  /**
   * Money is a decimal STRING ("60.00"), not a number.
   * JavaScript numbers are floating point: 0.1 + 0.2 = 0.30000000000000004.
   * Keeping the exact string avoids rounding errors; see src/lib/money.ts.
   */
  price: string
  is_available: boolean
}

/** Milk type, used for the Cow / Buffalo filter chips on the home page. */
export type ProductCategory = 'cow' | 'buffalo'
