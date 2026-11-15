/**
 * Product service: the ONLY place pages get or change product data (M3-09).
 *
 * Calls the real backend through apiClient. The function names, parameters and return
 * types are the same as the M2 mock, so no page had to change. With VITE_USE_MOCKS=true
 * the mock in services/mock/ answers instead.
 */
import { api, queryString } from "@/services/apiClient"
import * as mock from "@/services/mock/mockProductService"
import { USE_MOCKS } from "@/services/mockMode"
import type { AdminProduct, Product, ProductCreate, ProductUpdate } from "@/types/product"

/**
 * GET /api/v1/products
 * Customers see available products only. The admin products page passes
 * `includeUnavailable: true` (ADR-006).
 */
export function getProducts(options: { includeUnavailable?: boolean } = {}): Promise<Product[]> {
  if (USE_MOCKS) return mock.getProducts(options)
  return api.get(`/products${queryString({ include_unavailable: options.includeUnavailable || undefined })}`)
}

/** GET /api/v1/products/{id} */
export function getProduct(productId: number): Promise<Product> {
  if (USE_MOCKS) return mock.getProduct(productId)
  return api.get(`/products/${productId}`)
}

/** GET /api/v1/admin/products → every product WITH its stock number (ADMIN only, #92). */
export function getAdminProducts(): Promise<AdminProduct[]> {
  if (USE_MOCKS) return mock.getAdminProducts()
  return api.get("/admin/products")
}

/** POST /api/v1/admin/products → 201 with the new product (#86). */
export function createProduct(input: ProductCreate): Promise<AdminProduct> {
  if (USE_MOCKS) return mock.createProduct(input)
  return api.post("/admin/products", input)
}

/** PATCH /api/v1/admin/products/{id}: only the fields that change. */
export function updateProduct(productId: number, changes: ProductUpdate): Promise<AdminProduct> {
  if (USE_MOCKS) return mock.updateProduct(productId, changes)
  return api.patch(`/admin/products/${productId}`, changes)
}

/** DELETE /api/v1/admin/products/{id} → 204; 409 PRODUCT_IN_USE if it was ever ordered. */
export function deleteProduct(productId: number): Promise<void> {
  if (USE_MOCKS) return mock.deleteProduct(productId)
  return api.del(`/admin/products/${productId}`)
}
