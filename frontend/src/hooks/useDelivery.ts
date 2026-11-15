/**
 * Delivery boy app hooks (#109).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { getDeliveryMe, getMyDeliveries, updateDeliveryStatus } from "@/services/deliveryService"
import type { DeliveryStatus } from "@/types/delivery"

export const deliveryKeys = {
  all: ["delivery"] as const,
  me: ["delivery", "me"] as const,
  orders: ["delivery", "orders"] as const,
}

export function useDeliveryMe() {
  return useQuery({ queryKey: deliveryKeys.me, queryFn: () => getDeliveryMe() })
}

/** Today's deliveries. Refreshed every minute, so orders the admin confirms appear by themselves. */
export function useMyDeliveries() {
  return useQuery({ queryKey: deliveryKeys.orders, queryFn: () => getMyDeliveries(), refetchInterval: 60_000 })
}

export function useUpdateDeliveryStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: DeliveryStatus }) =>
      updateDeliveryStatus(orderId, status),
    onSettled: () => queryClient.invalidateQueries({ queryKey: deliveryKeys.orders }),
  })
}
