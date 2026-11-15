/**
 * Delivery slot service (#100): the ONLY place pages get or change delivery slots.
 * Real backend only (built after the M2 mocks, like subscriptions).
 */
import { api } from "@/services/apiClient"
import { USE_MOCKS } from "@/services/mockMode"
import { ServiceError } from "@/services/serviceError"
import type { AdminDeliverySlot, DeliverySlot, DeliverySlotCreate, DeliverySlotUpdate } from "@/types/deliverySlot"

function needsBackend(): Promise<never> {
  return Promise.reject(
    new ServiceError(503, {
      error: {
        code: "INTERNAL_ERROR",
        message: "Delivery slots need the real backend. Set VITE_USE_MOCKS=false.",
        request_id: "mock",
      },
    }),
  )
}

/** GET /api/v1/delivery-slots: active slots by time, with the places left. */
export function getDeliverySlots(): Promise<DeliverySlot[]> {
  if (USE_MOCKS) return needsBackend()
  return api.get("/delivery-slots")
}

/** GET /api/v1/admin/delivery-slots (ADMIN only): all slots, with capacity and bookings. */
export function getAdminDeliverySlots(): Promise<AdminDeliverySlot[]> {
  if (USE_MOCKS) return needsBackend()
  return api.get("/admin/delivery-slots")
}

/** POST /api/v1/admin/delivery-slots → 201 with the new slot. */
export function createDeliverySlot(input: DeliverySlotCreate): Promise<AdminDeliverySlot> {
  if (USE_MOCKS) return needsBackend()
  return api.post("/admin/delivery-slots", input)
}

/** PATCH /api/v1/admin/delivery-slots/{id}: only the changed fields. */
export function updateDeliverySlot(slotId: number, changes: DeliverySlotUpdate): Promise<AdminDeliverySlot> {
  if (USE_MOCKS) return needsBackend()
  return api.patch(`/admin/delivery-slots/${slotId}`, changes)
}

/** DELETE /api/v1/admin/delivery-slots/{id} → 204 (only a slot nobody booked). */
export function deleteDeliverySlot(slotId: number): Promise<void> {
  if (USE_MOCKS) return needsBackend()
  return api.del(`/admin/delivery-slots/${slotId}`)
}
