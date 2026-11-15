/** useOrder(id): one full order (GET /orders/{id}; mocked in M2). */
import { useQuery } from "@tanstack/react-query"

import { orderKeys } from "@/hooks/orderKeys"
import { getOrder } from "@/services/orderService"

export function useOrder(orderId: number) {
  return useQuery({
    queryKey: orderKeys.detail(orderId),
    queryFn: () => getOrder(orderId),
  })
}
