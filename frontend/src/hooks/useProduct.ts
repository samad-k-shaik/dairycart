/**
 * useProduct(id): one product for the details page.
 * Cached under ["products", id]; a 404/422 is not retried (see lib/queryClient.ts).
 */
import { useQuery } from "@tanstack/react-query"

import { productKeys } from "@/hooks/useProducts"
import { getProduct } from "@/services/productService"

export function useProduct(productId: number) {
  return useQuery({
    queryKey: productKeys.detail(productId),
    queryFn: () => getProduct(productId),
  })
}
