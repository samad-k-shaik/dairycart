/**
 * Product types: mirror `docs/05-api/api-contracts.md` field-for-field.
 * Field names stay in snake_case exactly as the API sends them.
 */

/**
 * Money is a decimal string with 2 places (e.g. "60.00"), exactly like the API.
 * A JavaScript number could lose precision (0.1 + 0.2 = 0.30000000000000004);
 * a string keeps the exact value. Format it for display with `formatCurrency`.
 */
export type Money = string

/** GET /products and GET /products/{id} */
export type Product = {
  product_id: number
  name: string
  size: string
  price: Money
  is_available: boolean
}
