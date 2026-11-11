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
  /** Is at least one bottle left? Customers never get the number (#92). */
  in_stock: boolean
}

/** GET /admin/products row and admin create/edit response: also the stock number (#92). */
export type AdminProduct = Product & {
  stock_quantity: number
}

/** POST /admin/products body (issue #86). The server gives the product_id. */
export type ProductCreate = {
  name: string
  size: string
  price: Money
  is_available?: boolean // default true
  stock_quantity?: number // default 0 (#92)
}

/** PATCH /admin/products/{id} body: only the fields that change. */
export type ProductUpdate = Partial<Omit<AdminProduct, "product_id" | "in_stock">>
