/**
 * Delivery boy hooks (#103). Every change refreshes the list AND the Deliveries page
 * (orders are matched to delivery boys by PIN code when the page loads).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { orderKeys } from "@/hooks/orderKeys"
import {
  addArea,
  createDeliveryBoy,
  deleteDeliveryBoy,
  getDeliveryBoys,
  removeArea,
  updateDeliveryBoy,
} from "@/services/deliveryBoyService"
import type { AreaInput, DeliveryBoyInput, DeliveryBoyUpdate } from "@/types/deliveryBoy"

export const deliveryBoyKeys = { all: ["delivery-boys"] as const }

export function useDeliveryBoys() {
  return useQuery({ queryKey: deliveryBoyKeys.all, queryFn: getDeliveryBoys })
}

function useRefresh() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: deliveryBoyKeys.all }),
      queryClient.invalidateQueries({ queryKey: orderKeys.all }), // Deliveries page
    ])
}

export function useCreateDeliveryBoy() {
  const refresh = useRefresh()
  return useMutation({ mutationFn: (input: DeliveryBoyInput) => createDeliveryBoy(input), onSuccess: refresh })
}

export function useUpdateDeliveryBoy() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, changes }: { id: number; changes: DeliveryBoyUpdate }) => updateDeliveryBoy(id, changes),
    onSuccess: refresh,
  })
}

export function useDeleteDeliveryBoy() {
  const refresh = useRefresh()
  return useMutation({ mutationFn: (id: number) => deleteDeliveryBoy(id), onSuccess: refresh })
}

export function useAddArea() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, area }: { id: number; area: AreaInput }) => addArea(id, area),
    onSuccess: refresh,
  })
}

export function useRemoveArea() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, pincode }: { id: number; pincode: string }) => removeArea(id, pincode),
    onSuccess: refresh,
  })
}
