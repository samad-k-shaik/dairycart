/**
 * Subscription hooks (#97): TanStack Query wrappers around services/subscriptionService.
 *
 * After a change, the affected lists are marked out of date (invalidateQueries), so the
 * pages that show them refetch from the backend.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  cancelSubscription,
  createSubscription,
  getAdminSubscriptions,
  getMySubscriptions,
} from "@/services/subscriptionService"
import type { CreateSubscriptionRequest, SubscriptionStatus } from "@/types/subscription"

export const subscriptionKeys = {
  all: ["subscriptions"] as const,
  mine: ["subscriptions", "mine"] as const,
  admin: (status?: SubscriptionStatus) => ["subscriptions", "admin", status ?? "all"] as const,
}

export function useMySubscriptions() {
  return useQuery({ queryKey: subscriptionKeys.mine, queryFn: getMySubscriptions })
}

export function useAdminSubscriptions(status?: SubscriptionStatus) {
  return useQuery({
    queryKey: subscriptionKeys.admin(status),
    queryFn: () => getAdminSubscriptions(status),
  })
}

export function useCreateSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateSubscriptionRequest) => createSubscription(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: subscriptionKeys.all }),
  })
}

export function useCancelSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (subscriptionId: number) => cancelSubscription(subscriptionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: subscriptionKeys.all }),
  })
}

