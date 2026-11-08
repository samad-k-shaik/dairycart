/**
 * useProducts: available products for the customer pages.
 *
 * useQuery calls the service and gives back { data, isPending, isError, error, refetch }.
 * Pages use those flags for loading/error states instead of writing that logic themselves.
 * Results are cached under the key ["products"], so other pages reuse them.
 */
import { useQuery } from "@tanstack/react-query"

import { getProducts } from "@/services/productService"

export const productKeys = {
  all: ["products"] as const,
  detail: (id: number) => ["products", id] as const,
  admin: ["products", "include-unavailable"] as const,
}

export function useProducts() {
  return useQuery({
    queryKey: productKeys.all,
    queryFn: () => getProducts(), // available products only (FR-C1)
  })
}

/** Admin products table: ALL products, including unavailable ones (FR-A5, ADR-006). */
export function useAdminProducts() {
  return useQuery({
    queryKey: productKeys.admin,
    queryFn: () => getProducts({ includeUnavailable: true }),
  })
}
