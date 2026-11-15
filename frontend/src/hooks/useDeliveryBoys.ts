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
  getLiveMap,
  removeArea,
  setDeliveryBoyLogin,
  updateDeliveryBoy,
} from "@/services/deliveryBoyService"
import type { AreaInput, DeliveryBoyInput, DeliveryBoyUpdate } from "@/types/deliveryBoy"

export const deliveryBoyKeys = { all: ["delivery-boys"] as const }

/**
 * #111: the live map, asked again every 10 s. TanStack Query pauses the interval while
 * the tab is hidden (refetchIntervalInBackground is false), so a forgotten tab costs nothing.
 */
export const liveMapKey = [...deliveryBoyKeys.all, "live"] as const

/** #113: `streaming` = the SSE stream is delivering updates, so polling is switched off. */
export function useLiveMap(streaming = false) {
  return useQuery({ queryKey: liveMapKey, queryFn: getLiveMap, refetchInterval: streaming ? false : 10_000 })
}

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

/** #109: give a delivery boy a login, or a new password. */
export function useSetDeliveryBoyLogin() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) => setDeliveryBoyLogin(id, password),
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
