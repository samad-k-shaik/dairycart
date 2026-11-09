/**
 * Admin product form rules (issue #86). The same limits as the backend
 * (POST/PATCH /api/v1/admin/products) and the database columns:
 * name 2–100 characters, size 1–20 characters, price > 0 with at most 2 decimals.
 *
 * The UI checks give fast, friendly feedback; the backend validates again.
 * Each validate function returns an error message, or null when the value is valid.
 * (Relative ".ts" imports so Node's test runner can load this file.)
 */
import type { Money, Product, ProductUpdate } from "../types/product.ts"

export const PRODUCT_NAME_MIN = 2
export const PRODUCT_NAME_MAX = 100
export const PRODUCT_SIZE_MAX = 20
/** NUMERIC(10,2): up to 8 digits before the point. */
const PRICE_PATTERN = /^\d{1,8}(\.\d{1,2})?$/

/** What the form fields hold: plain text, exactly as typed. */
export type ProductFormValues = {
  name: string
  size: string
  price: string
  is_available: boolean
}

export type ProductFormErrors = Partial<Record<"name" | "size" | "price", string>>

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  name: "",
  size: "",
  price: "",
  is_available: true,
}

export function validateProductName(value: string): string | null {
  const name = value.trim()
  if (name.length === 0) return "Please enter a product name."
  if (name.length < PRODUCT_NAME_MIN || name.length > PRODUCT_NAME_MAX) {
    return `Name must be ${PRODUCT_NAME_MIN}–${PRODUCT_NAME_MAX} characters.`
  }
  return null
}

export function validateProductSize(value: string): string | null {
  const size = value.trim()
  if (size.length === 0) return "Please enter a size, e.g. 500 ml."
  if (size.length > PRODUCT_SIZE_MAX) return `Size must be at most ${PRODUCT_SIZE_MAX} characters.`
  return null
}

export function validatePrice(value: string): string | null {
  const price = value.trim()
  if (price.length === 0) return "Please enter a price."
  if (!PRICE_PATTERN.test(price)) return "Enter a price like 45 or 45.50 (up to 2 decimals)."
  if (/^[0.]+$/.test(price)) return "Price must be more than ₹0."
  return null
}

export function validateProductForm(values: ProductFormValues): ProductFormErrors {
  const errors: ProductFormErrors = {}
  const name = validateProductName(values.name)
  const size = validateProductSize(values.size)
  const price = validatePrice(values.price)
  if (name) errors.name = name
  if (size) errors.size = size
  if (price) errors.price = price
  return errors
}

/** "45" → "45.00", "45.5" → "45.50", "045.50" → "45.50": the contract's money format.
 *  String maths only, never Number(), so no floating-point rounding. Call after validatePrice. */
export function normalizePrice(value: string): Money {
  const [rupees, paise = ""] = value.trim().split(".")
  const wholeRupees = rupees.replace(/^0+(?=\d)/, "")
  return `${wholeRupees}.${paise.padEnd(2, "0")}`
}

/** A product's current values, to fill the Edit form. */
export function toFormValues(product: Product): ProductFormValues {
  return {
    name: product.name,
    size: product.size,
    price: product.price,
    is_available: product.is_available,
  }
}

/** Clean form values (trimmed text, "45.00" price), ready to send. */
export function toProductInput(values: ProductFormValues) {
  return {
    name: values.name.trim(),
    size: values.size.trim(),
    price: normalizePrice(values.price),
    is_available: values.is_available,
  }
}

/** For PATCH: only the fields that changed. Empty object = nothing to save. */
export function changedFields(product: Product, values: ProductFormValues): ProductUpdate {
  const input = toProductInput(values)
  const changes: ProductUpdate = {}
  if (input.name !== product.name) changes.name = input.name
  if (input.size !== product.size) changes.size = input.size
  if (input.price !== product.price) changes.price = input.price
  if (input.is_available !== product.is_available) changes.is_available = input.is_available
  return changes
}

/** Same name AND size, ignoring upper/lower case: the backend's duplicate rule.
 *  `excludeId` skips the product being edited. */
export function findDuplicate(
  products: Product[],
  name: string,
  size: string,
  excludeId?: number,
): Product | undefined {
  const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()
  return products.find(
    (p) => p.product_id !== excludeId && sameText(p.name, name) && sameText(p.size, size),
  )
}
