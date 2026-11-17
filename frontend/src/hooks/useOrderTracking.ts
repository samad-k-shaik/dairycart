/**
 * #112: where is my order? Asked again every 10 s (paused while the tab is hidden).
 * Mounted only while the order is out for delivery, so no polling otherwise.
 */
import { useQuery } from "@tanstack/react-query"

import { orderKeys } from "@/hooks/orderKeys"
import { getOrderTracking } from "@/services/orderService"

export const trackingKey = (orderId: number) => [...orderKeys.detail(orderId), "tracking"] as const

/** #113: `streaming` = the SSE stream is delivering updates, so polling is switched off. */
export function useOrderTracking(orderId: number, streaming = false) {
  return useQuery({
    queryKey: trackingKey(orderId),
    queryFn: () => getOrderTracking(orderId),
    refetchInterval: streaming ? false : 10_000,
  })
}
