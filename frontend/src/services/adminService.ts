/**
 * Admin per-user views (#101). Real backend only (built after the M2 mocks).
 * (#104: the daily deliveries view moved into the Orders board, orderService.getAdminOrders.)
 */
import { api } from "@/services/apiClient"
import { USE_MOCKS } from "@/services/mockMode"
import { ServiceError } from "@/services/serviceError"
import type { AdminUserDetail } from "@/types/auth"
import type { OrderSummary } from "@/types/order"

function needsBackend(): Promise<never> {
  return Promise.reject(
    new ServiceError(503, {
      error: {
        code: "INTERNAL_ERROR",
        message: "This page needs the real backend. Set VITE_USE_MOCKS=false.",
        request_id: "mock",
      },
    }),
  )
}

/** GET /api/v1/admin/users/{id}: the user + order count and amount spent. 404 if missing. */
export function getAdminUser(userId: number): Promise<AdminUserDetail> {
  if (USE_MOCKS) return needsBackend()
  return api.get(`/admin/users/${userId}`)
}

/** GET /api/v1/admin/users/{id}/orders: all of the user's orders, newest first. */
export function getAdminUserOrders(userId: number): Promise<OrderSummary[]> {
  if (USE_MOCKS) return needsBackend()
  return api.get(`/admin/users/${userId}/orders`)
}
