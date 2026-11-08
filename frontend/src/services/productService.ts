/**
 * Product service: the ONLY place pages get product data from.
 *
 * M2: answers from mock data after a short delay.
 * M3: the bodies switch to real HTTP calls; the function names, parameters
 *     and return types stay the same, so pages do not change.
 */
import type { Product } from "@/types/product"
import { db, fail, readDb, respond } from "@/services/mock/mockServer"

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
