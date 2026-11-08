/**
 * useCreateOrder(): places an order (POST /orders; mocked in M2).
 *
 * useMutation is TanStack Query's tool for SENDING data (useQuery reads data).
 * It gives `mutate`, `isPending` (to disable the button) and `error`.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { orderKeys } from "@/hooks/orderKeys"
import { createOrder } from "@/services/orderService"
import type { CreateOrderRequest } from "@/types/order"

export function useCreateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: CreateOrderRequest) => createOrder(request),
    onSuccess: (order) => {
      // Put the new order in the cache so the confirmation page shows it instantly.
      queryClient.setQueryData(orderKeys.detail(order.order_id), order)
      // Order lists (history, admin) are now out of date: refetch them next time they are shown.
      queryClient.invalidateQueries({ queryKey: orderKeys.all })
    },
  })
}
