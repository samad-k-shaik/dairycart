/**
 * Product service – the ONLY place the app gets product data from.
 *
 * M2 (now):   reads the mock database with a simulated network delay.
 * M3 (#309):  replace each function body with an HTTP call, e.g.
 *               return apiClient.get<Product[]>('/products')
 *             The function names and return types stay the same, so the hooks
 *             and pages that call them do not change at all.
 */
import { ApiRequestError } from '@/services/apiError'
import { mockProducts } from '@/services/mock/mockDb'
import { simulateRequest } from '@/services/mock/mockServer'
import type { Product } from '@/types/product'

export interface GetProductsOptions {
  /** Admin view only (ADR-006): also return products where is_available = false. */
  includeUnavailable?: boolean
}

/**
 * GET /api/v1/products
 * FR-C1: by default ONLY available products are returned, exactly like the
 * real API, so the customer home page never shows unavailable products.
 */
export function getProducts(options: GetProductsOptions = {}): Promise<Product[]> {
  return simulateRequest(() =>
    options.includeUnavailable
      ? [...mockProducts]
      : mockProducts.filter((product) => product.is_available),
  )
}

/**
 * GET /api/v1/products/{id}
 * Throws a 404 ApiRequestError for unknown ids (FR-C2 "Product not found").
 */
export function getProduct(productId: number): Promise<Product> {
  return simulateRequest(() => {
    const product = mockProducts.find((p) => p.product_id === productId)
    if (!product) {
      throw new ApiRequestError(404, {
        code: 'NOT_FOUND',
        message: `Product ${productId} was not found.`,
      })
    }
    return product
  })
}
