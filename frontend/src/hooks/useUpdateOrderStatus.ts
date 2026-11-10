/**
 * useUpdateOrderStatus(): admin status change (PATCH /admin/orders/{id}/status).
 * Afterwards (success or error), refresh every order query so the table, dashboard and history update.
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
    },
    // Success OR error: refetch the table, details and dashboard counts (M3-11). After a
    // 409 (e.g. another admin already changed this order) the panel then shows the
    // order's REAL current status instead of the old one.
    onSettled: () => queryClient.invalidateQueries({ queryKey: orderKeys.all }),
  })
}
