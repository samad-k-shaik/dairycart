/**
 * Address service (#102): the logged-in user's saved delivery addresses.
 * Real backend only (built after the M2 mocks).
 */
import { api } from "@/services/apiClient"
import { USE_MOCKS } from "@/services/mockMode"
import { ServiceError } from "@/services/serviceError"
import type { Address, AddressInput, AddressUpdate } from "@/types/address"

function needsBackend(): Promise<never> {
  return Promise.reject(
    new ServiceError(503, {
      error: {
        code: "INTERNAL_ERROR",
        message: "Addresses need the real backend. Set VITE_USE_MOCKS=false.",
        request_id: "mock",
      },
    }),
  )
}

/** GET /api/v1/addresses: the default first. */
export function getAddresses(): Promise<Address[]> {
  if (USE_MOCKS) return needsBackend()
  return api.get("/addresses")
}

/** POST /api/v1/addresses → 201. The first address becomes the default. */
export function createAddress(input: AddressInput): Promise<Address> {
  if (USE_MOCKS) return needsBackend()
  return api.post("/addresses", input)
}

/** PATCH /api/v1/addresses/{id}: only changed fields. */
export function updateAddress(addressId: number, changes: AddressUpdate): Promise<Address> {
  if (USE_MOCKS) return needsBackend()
  return api.patch(`/addresses/${addressId}`, changes)
}

/** POST /api/v1/addresses/{id}/default */
export function makeDefaultAddress(addressId: number): Promise<Address> {
  if (USE_MOCKS) return needsBackend()
  return api.post(`/addresses/${addressId}/default`, undefined)
}

/** DELETE /api/v1/addresses/{id} → 204. Past orders keep their own copy. */
export function deleteAddress(addressId: number): Promise<void> {
  if (USE_MOCKS) return needsBackend()
  return api.del(`/addresses/${addressId}`)
}
