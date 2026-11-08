/**
 * Product data hooks (#24 useProducts, #25 useProduct).
 *
 * `useQuery` gives a component everything it needs about a request:
 *   data       – the result once it has arrived
 *   isPending  – true while the first request is in flight → show a skeleton
 *   isError / error – the request failed → show an error state
 *   refetch()  – try again (used by the "Retry" button)
 * Pages never call services directly; they use these hooks.
 */
import { useQuery } from '@tanstack/react-query'
import { getProduct, getProducts } from '@/services/productService'
import { queryKeys } from './queryKeys'

/** Product list. Customers get only available products (FR-C1); admin passes includeUnavailable (FR-A5). */
export function useProducts(options: { includeUnavailable?: boolean } = {}) {
  const includeUnavailable = options.includeUnavailable ?? false
  return useQuery({
    queryKey: queryKeys.products(includeUnavailable),
    queryFn: () => getProducts({ includeUnavailable }),
  })
}

/**
 * One product by id (FR-C2). `productId` comes from the URL, so it may be
 * invalid (e.g. /products/abc → NaN). `enabled: false` skips the request in that case
 * and the page shows "Product not found" straight away.
 */
export function useProduct(productId: number) {
  const isValidId = Number.isInteger(productId) && productId > 0
  return useQuery({
    queryKey: queryKeys.product(productId),
    queryFn: () => getProduct(productId),
    enabled: isValidId,
  })
}
