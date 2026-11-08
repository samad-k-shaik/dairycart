/**
 * useAdminOrders(query): admin order list page + dashboard counts
 * (GET /admin/orders; mocked in M2). The response's `status_counts` counts ALL orders,
 * ignoring the status filter, so the dashboard can show per-status totals.
 */
import { useQuery } from "@tanstack/react-query"

import { orderKeys } from "@/hooks/orderKeys"
import { getAdminOrders } from "@/services/orderService"
import type { AdminOrderQuery } from "@/types/order"

export function useAdminOrders(query: AdminOrderQuery = {}) {
  return useQuery({
    queryKey: orderKeys.admin(query),
    queryFn: () => getAdminOrders(query),
  })
}
