/**
 * Address hooks (#102): TanStack Query wrappers around services/addressService.
 * Every change refetches the list (the default may move to another address).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  createAddress,
  deleteAddress,
  getAddresses,
  makeDefaultAddress,
  updateAddress,
} from "@/services/addressService"
import type { AddressInput, AddressUpdate } from "@/types/address"

export const addressKeys = { all: ["addresses"] as const }

export function useAddresses({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: addressKeys.all, queryFn: getAddresses, enabled })
}

function useRefresh() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: addressKeys.all })
}

export function useCreateAddress() {
  const refresh = useRefresh()
  return useMutation({ mutationFn: (input: AddressInput) => createAddress(input), onSuccess: refresh })
}

export function useUpdateAddress() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ addressId, changes }: { addressId: number; changes: AddressUpdate }) =>
      updateAddress(addressId, changes),
    onSuccess: refresh,
  })
}

export function useMakeDefaultAddress() {
  const refresh = useRefresh()
  return useMutation({ mutationFn: (addressId: number) => makeDefaultAddress(addressId), onSuccess: refresh })
}

export function useDeleteAddress() {
  const refresh = useRefresh()
  return useMutation({ mutationFn: (addressId: number) => deleteAddress(addressId), onSuccess: refresh })
}
