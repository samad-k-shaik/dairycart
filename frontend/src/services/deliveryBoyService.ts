/**
 * Delivery boy service (#103): admin-only list of delivery boys and their areas
 * (PIN codes). Real backend only.
 */
import { api } from "@/services/apiClient"
import { USE_MOCKS } from "@/services/mockMode"
import { ServiceError } from "@/services/serviceError"
import type { AreaInput, DeliveryBoy, DeliveryBoyInput, DeliveryBoyUpdate } from "@/types/deliveryBoy"
import type { LiveBoy } from "@/types/liveMap"

function needsBackend(): Promise<never> {
  return Promise.reject(
    new ServiceError(503, {
      error: {
        code: "INTERNAL_ERROR",
        message: "Delivery boys need the real backend. Set VITE_USE_MOCKS=false.",
        request_id: "mock",
      },
    }),
  )
}

const BASE = "/admin/delivery-boys"

/** GET: active first, with areas and today's order count. */
export function getDeliveryBoys(): Promise<DeliveryBoy[]> {
  if (USE_MOCKS) return needsBackend()
  return api.get(BASE)
}

export function createDeliveryBoy(input: DeliveryBoyInput): Promise<DeliveryBoy> {
  if (USE_MOCKS) return needsBackend()
  return api.post(BASE, input)
}

export function updateDeliveryBoy(id: number, changes: DeliveryBoyUpdate): Promise<DeliveryBoy> {
  if (USE_MOCKS) return needsBackend()
  return api.patch(`${BASE}/${id}`, changes)
}

/** DELETE → 204. His areas become free. */
export function deleteDeliveryBoy(id: number): Promise<void> {
  if (USE_MOCKS) return needsBackend()
  return api.del(`${BASE}/${id}`)
}

/** Allocate a PIN code. 409 AREA_ALREADY_ALLOCATED names the current owner. */
export function addArea(id: number, area: AreaInput): Promise<DeliveryBoy> {
  if (USE_MOCKS) return needsBackend()
  return api.post(`${BASE}/${id}/areas`, area)
}

/** #111: live map data (positions, stale flags, today's order pins). */
export function getLiveMap(): Promise<LiveBoy[]> {
  if (USE_MOCKS) return needsBackend()
  return api.get(`${BASE}/locations`)
}

/** #109: create his login, or set a new password. 409 if another account uses his number. */
export function setDeliveryBoyLogin(id: number, password: string): Promise<DeliveryBoy> {
  if (USE_MOCKS) return needsBackend()
  return api.put(`${BASE}/${id}/login`, { password })
}

export function removeArea(id: number, pincode: string): Promise<DeliveryBoy> {
  if (USE_MOCKS) return needsBackend()
  return api.del<DeliveryBoy>(`${BASE}/${id}/areas/${pincode}`)
}
