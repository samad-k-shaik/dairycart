/**
 * Subscription service (#97): the ONLY place pages get or send subscription data.
 *
 * Calls the real backend through apiClient. Subscriptions were built after the M2 mocks,
 * so there is no mock version (AGENTS.md: new features work against the real backend).
 * With VITE_USE_MOCKS=true these calls fail with a clear message instead.
 */
import { api, queryString } from "@/services/apiClient"
import { USE_MOCKS } from "@/services/mockMode"
import { ServiceError } from "@/services/serviceError"
import type {
  AdminSubscriptionSummary,
  CreateSubscriptionRequest,
  GenerateOrdersResult,
  Subscription,
  SubscriptionStatus,
} from "@/types/subscription"

function needsBackend(): Promise<never> {
  return Promise.reject(
    new ServiceError(503, {
      error: {
        code: "INTERNAL_ERROR",
        message: "Subscriptions need the real backend. Set VITE_USE_MOCKS=false.",
        request_id: "mock",
      },
    }),
  )
}

/** POST /api/v1/subscriptions → 201 with the new subscription (prices locked). */
export function createSubscription(request: CreateSubscriptionRequest): Promise<Subscription> {
  if (USE_MOCKS) return needsBackend()
  return api.post("/subscriptions", request)
}

/** GET /api/v1/subscriptions/mine: the logged-in user's subscriptions, newest first. */
export function getMySubscriptions(): Promise<Subscription[]> {
  if (USE_MOCKS) return needsBackend()
  return api.get("/subscriptions/mine")
}

/** POST /api/v1/subscriptions/{id}/cancel → the cancelled subscription. */
export function cancelSubscription(subscriptionId: number): Promise<Subscription> {
  if (USE_MOCKS) return needsBackend()
  return api.post(`/subscriptions/${subscriptionId}/cancel`, undefined)
}

/** GET /api/v1/admin/subscriptions (ADMIN only), optionally one status. */
export function getAdminSubscriptions(status?: SubscriptionStatus): Promise<AdminSubscriptionSummary[]> {
  if (USE_MOCKS) return needsBackend()
  return api.get(`/admin/subscriptions${queryString({ status })}`)
}

/** POST /api/v1/admin/subscriptions/generate-orders: create today's orders (ADMIN). */
export function generateSubscriptionOrders(): Promise<GenerateOrdersResult> {
  if (USE_MOCKS) return needsBackend()
  return api.post("/admin/subscriptions/generate-orders", undefined)
}
