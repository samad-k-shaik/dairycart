/**
 * #112: where is my order? Asked again every 10 s (paused while the tab is hidden).
 * Mounted only while the order is out for delivery, so no polling otherwise.
 */
import { useQuery } from "@tanstack/react-query"

import { orderKeys } from "@/hooks/orderKeys"
import { getOrderTracking } from "@/services/orderService"

export function useOrderTracking(orderId: number) {
  return useQuery({
    queryKey: [...orderKeys.detail(orderId), "tracking"],
    queryFn: () => getOrderTracking(orderId),
    refetchInterval: 10_000,
  })
}
