/**
 * Delivery slot hooks (#100): TanStack Query wrappers around services/deliverySlotService.
 *
 * Bookings change the "places left", so subscribing, cancelling or changing a time also
 * refreshes the slots (see useSubscriptions.ts), and slot edits refresh subscriptions
 * (their booked slot's name or time may have changed).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  createDeliverySlot,
  deleteDeliverySlot,
  getAdminDeliverySlots,
  getDeliverySlots,
  updateDeliverySlot,
} from "@/services/deliverySlotService"
import type { DeliverySlotCreate, DeliverySlotUpdate } from "@/types/deliverySlot"

export const deliverySlotKeys = {
  all: ["delivery-slots"] as const,
  available: ["delivery-slots", "available"] as const,
  admin: ["delivery-slots", "admin"] as const,
}

/** Active slots with places left (checkout, "Change time"). */
export function useDeliverySlots({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: deliverySlotKeys.available, queryFn: getDeliverySlots, enabled })
}

export function useAdminDeliverySlots() {
  return useQuery({ queryKey: deliverySlotKeys.admin, queryFn: getAdminDeliverySlots })
}

function useRefreshSlots() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: deliverySlotKeys.all }),
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] }),
    ])
}

export function useCreateDeliverySlot() {
  const refresh = useRefreshSlots()
  return useMutation({
    mutationFn: (input: DeliverySlotCreate) => createDeliverySlot(input),
    onSuccess: refresh,
  })
}

export function useUpdateDeliverySlot() {
  const refresh = useRefreshSlots()
  return useMutation({
    mutationFn: ({ slotId, changes }: { slotId: number; changes: DeliverySlotUpdate }) =>
      updateDeliverySlot(slotId, changes),
    onSuccess: refresh,
  })
}

export function useDeleteDeliverySlot() {
  const refresh = useRefreshSlots()
  return useMutation({
    mutationFn: (slotId: number) => deleteDeliverySlot(slotId),
    onSuccess: refresh,
  })
}
