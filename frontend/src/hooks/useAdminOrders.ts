/**
 * Admin order hooks: list with filter/pagination (#30, #31) and status update (#31).
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getAdminOrders, updateOrderStatus } from '@/services/orderService'
import type { AdminOrderQuery, OrderStatus } from '@/types/order'
import { queryKeys } from './queryKeys'

/** One page of admin orders plus `status_counts` for the dashboard. */
export function useAdminOrders(query: AdminOrderQuery = {}) {
  return useQuery({
    queryKey: queryKeys.adminOrders(query),
    queryFn: () => getAdminOrders(query),
    // While page 2 loads, keep showing page 1 instead of flashing a skeleton.
    placeholderData: keepPreviousData,
  })
}

/** Change an order's status (FR-A4). Invalid transitions come back as a 409 error. */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: OrderStatus }) =>
      updateOrderStatus(orderId, status),
    onSuccess: (order) => {
      queryClient.setQueryData(queryKeys.order(order.order_id), order)
      // Refresh the admin table, dashboard counts AND the customer's history.
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders() })
    },
  })
}
