/**
 * Admin product changes (issue #86): add, edit, delete.
 *
 * useMutation runs the service call and gives { mutate, isPending, error }.
 * After a success we invalidate every query under ["products"] (admin table,
 * customer home, product details), so all of them refetch the new data.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { productKeys } from "@/hooks/useProducts"
import { createProduct, deleteProduct, updateProduct } from "@/services/productService"
import type { ProductCreate, ProductUpdate } from "@/types/product"

function useRefreshProducts() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: productKeys.all })
}

export function useCreateProduct() {
  const refresh = useRefreshProducts()
  return useMutation({
    mutationFn: (input: ProductCreate) => createProduct(input),
    onSuccess: refresh,
  })
}

export function useUpdateProduct() {
  const refresh = useRefreshProducts()
  return useMutation({
    mutationFn: ({ productId, changes }: { productId: number; changes: ProductUpdate }) =>
      updateProduct(productId, changes),
    onSuccess: refresh,
  })
}

export function useDeleteProduct() {
  const refresh = useRefreshProducts()
  return useMutation({
    mutationFn: (productId: number) => deleteProduct(productId),
    onSuccess: refresh,
  })
}
