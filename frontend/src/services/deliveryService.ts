/**
 * Delivery boy app service (#109): the logged-in delivery boy's record and orders.
 * Real backend only.
 */
import { api } from "@/services/apiClient"
import { USE_MOCKS } from "@/services/mockMode"
import { ServiceError } from "@/services/serviceError"
import type { DeliveryMe, DeliveryOrder, DeliveryStatus, LocationBody, RoundState } from "@/types/delivery"

function needsBackend(): Promise<never> {
  return Promise.reject(
    new ServiceError(503, {
      error: {
        code: "INTERNAL_ERROR",
        message: "The delivery pages need the real backend. Set VITE_USE_MOCKS=false.",
        request_id: "mock",
      },
    }),
  )
}

export function getDeliveryMe(): Promise<DeliveryMe> {
  if (USE_MOCKS) return needsBackend()
  return api.get("/delivery/me")
}

/** The day's orders in his areas (today when `date` is left out), not cancelled. */
export function getMyDeliveries(date?: string): Promise<DeliveryOrder[]> {
  if (USE_MOCKS) return needsBackend()
  return api.get(date ? `/delivery/me/orders?date=${encodeURIComponent(date)}` : "/delivery/me/orders")
}

/** 409 INVALID_STATUS_TRANSITION if the order moved on in the meantime. */
export function updateDeliveryStatus(orderId: number, status: DeliveryStatus): Promise<DeliveryOrder> {
  if (USE_MOCKS) return needsBackend()
  return api.patch(`/delivery/me/orders/${orderId}/status`, { status })
}

/** #110: start sharing his location. */
export function startRound(): Promise<RoundState> {
  if (USE_MOCKS) return needsBackend()
  return api.post("/delivery/me/round/start", {})
}

/** #110: stop sharing; the backend deletes his last position. */
export function stopRound(): Promise<RoundState> {
  if (USE_MOCKS) return needsBackend()
  return api.post("/delivery/me/round/stop", {})
}

/** #110: one GPS reading → 204. 409 ROUND_NOT_STARTED if the round was stopped. */
export function sendLocation(body: LocationBody): Promise<void> {
  if (USE_MOCKS) return needsBackend()
  return api.put("/delivery/me/location", body)
}
