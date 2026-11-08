/**
 * useUpdateOrderStatus(): admin status change (PATCH /admin/orders/{id}/status; mocked in M2).
 * On success, refresh every order query so the table, dashboard and history all update.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { orderKeys } from "@/hooks/orderKeys"
import { updateOrderStatus } from "@/services/orderService"
import type { OrderStatus } from "@/types/order"

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: OrderStatus }) =>
      updateOrderStatus(orderId, status),
    onSuccess: (order) => {
      queryClient.setQueryData(orderKeys.detail(order.order_id), order)
      queryClient.invalidateQueries({ queryKey: orderKeys.all })
    },
  })
}
