/**
 * Product service: the ONLY place pages get product data from.
 *
 * M2: answers from mock data after a short delay.
 * M3: the bodies switch to real HTTP calls; the function names, parameters
 *     and return types stay the same, so pages do not change.
 */
import type { ApiErrorDetail } from "@/types/api"
import type { Product, ProductCreate, ProductUpdate } from "@/types/product"
import {
  findDuplicate,
  normalizePrice,
  validatePrice,
  validateProductName,
  validateProductSize,
} from "@/lib/productForm"
import { db, fail, readDb, respond, saveDb } from "@/services/mock/mockServer"

/**
 * GET /api/v1/products
 * Customers see available products only. The admin products page passes
 * `includeUnavailable: true` (proposed query param, ADR-006).
 */
export function getProducts(options: { includeUnavailable?: boolean } = {}): Promise<Product[]> {
  const all = readDb().products // empty in the dev "empty" mock mode
  const products = options.includeUnavailable ? all : all.filter((product) => product.is_available)
  return respond(products)
}

/** GET /api/v1/products/{id} */
export function getProduct(productId: number): Promise<Product> {
  if (!Number.isInteger(productId) || productId < 1) {
    return fail(422, "VALIDATION_ERROR", "Request validation failed.", [
      { field: "id", issue: "must be a positive integer" },
    ])
  }
  const product = db.products.find((p) => p.product_id === productId)
  if (!product) {
    return fail(404, "NOT_FOUND", `Product ${productId} was not found.`)
  }
  return respond(product)
}

// ---- Admin product management (issue #86) ----
// The mock follows the same rules as the backend, so the page behaves the same in M3.

const IN_USE_MESSAGE =
  "This product has already been ordered, so it cannot be deleted. Mark it unavailable instead."

/** Field checks like the backend's 422: only the fields that are present. */
function validationDetails(input: ProductUpdate): ApiErrorDetail[] {
  const checks: [keyof ProductUpdate, string | null][] = [
    ["name", input.name === undefined ? null : validateProductName(input.name)],
    ["size", input.size === undefined ? null : validateProductSize(input.size)],
    ["price", input.price === undefined ? null : validatePrice(input.price)],
  ]
  return checks.flatMap(([field, issue]) => (issue ? [{ field, issue }] : []))
}

function alreadyExists(name: string, size: string) {
  return fail(409, "PRODUCT_ALREADY_EXISTS", `A product named '${name}' with size '${size}' already exists.`, [
    { field: "name", issue: "name and size must be unique" },
  ])
}

function notFound(productId: number) {
  return fail(404, "NOT_FOUND", `Product ${productId} was not found.`)
}

/** POST /api/v1/admin/products → 201 with the new product. */
export function createProduct(input: ProductCreate): Promise<Product> {
  const details = validationDetails(input)
  if (details.length > 0) return fail(422, "VALIDATION_ERROR", "Request validation failed.", details)

  const name = input.name.trim()
  const size = input.size.trim()
  if (findDuplicate(db.products, name, size)) return alreadyExists(name, size)

  const product: Product = {
    product_id: Math.max(0, ...db.products.map((p) => p.product_id)) + 1,
    name,
    size,
    price: normalizePrice(input.price),
    is_available: input.is_available ?? true,
  }
  db.products.push(product)
  saveDb()
  return respond(product)
}

/** PATCH /api/v1/admin/products/{id}: change only the fields sent. Old orders keep their prices. */
export function updateProduct(productId: number, changes: ProductUpdate): Promise<Product> {
  const product = db.products.find((p) => p.product_id === productId)
  if (!product) return notFound(productId)
  if (Object.keys(changes).length === 0) {
    return fail(422, "VALIDATION_ERROR", "Request validation failed.", [
      { field: "body", issue: "send at least one field to change" },
    ])
  }
  const details = validationDetails(changes)
  if (details.length > 0) return fail(422, "VALIDATION_ERROR", "Request validation failed.", details)

  const name = changes.name?.trim() ?? product.name
  const size = changes.size?.trim() ?? product.size
  if (findDuplicate(db.products, name, size, productId)) return alreadyExists(name, size)

  product.name = name
  product.size = size
  if (changes.price !== undefined) product.price = normalizePrice(changes.price)
  if (changes.is_available !== undefined) product.is_available = changes.is_available
  saveDb()
  return respond(product)
}

/** DELETE /api/v1/admin/products/{id} → 204, only if the product was never ordered. */
export async function deleteProduct(productId: number): Promise<void> {
  const index = db.products.findIndex((p) => p.product_id === productId)
  if (index === -1) return notFound(productId)
  const ordered = db.orders.some((order) => order.items.some((item) => item.product_id === productId))
  if (ordered) return fail(409, "PRODUCT_IN_USE", IN_USE_MESSAGE)

  db.products.splice(index, 1)
  saveDb()
  await respond(null) // same delay and dev "error" mode as other calls
}
