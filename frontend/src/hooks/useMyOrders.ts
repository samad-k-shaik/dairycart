/**
 * useMyOrders(): the logged-in user's orders, newest first (GET /orders/mine, #90).
 * Replaces the old lookup by phone number.
 */
import { useQuery } from "@tanstack/react-query"

import { orderKeys } from "@/hooks/orderKeys"
import { getMyOrders } from "@/services/orderService"

export function useMyOrders() {
  return useQuery({
    queryKey: orderKeys.mine,
    queryFn: getMyOrders,
  })
}
