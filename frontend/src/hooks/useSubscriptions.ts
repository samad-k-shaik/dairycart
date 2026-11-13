/**
 * Subscription hooks (#97): TanStack Query wrappers around services/subscriptionService.
 *
 * After a change, the affected lists are marked out of date (invalidateQueries), so the
 * pages that show them refetch from the backend.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { deliverySlotKeys } from "@/hooks/useDeliverySlots"
import {
  cancelSubscription,
  changeDeliverySlot,
  changeSubscriptionAddress,
  createSubscription,
  getAdminSubscriptions,
  getMySubscriptions,
} from "@/services/subscriptionService"
import type { CreateSubscriptionRequest, SubscriptionStatus } from "@/types/subscription"

export const subscriptionKeys = {
  all: ["subscriptions"] as const,
  mine: ["subscriptions", "mine"] as const,
  admin: (status?: SubscriptionStatus) => ["subscriptions", "admin", status ?? "all"] as const,
  adminForUser: (userId: number) => ["subscriptions", "admin", "user", userId] as const, // #101
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

/** Subscriptions AND delivery slots: a booking changes the slot's places left (#100). */
function useRefreshAfterChange() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all }),
      queryClient.invalidateQueries({ queryKey: deliverySlotKeys.all }),
    ])
}

/** #101: one user's subscriptions, for the admin user page. */
/** #102: deliver an active subscription to another saved address. */
export function useChangeSubscriptionAddress() {
  const refresh = useRefreshAfterChange()
  return useMutation({
    mutationFn: ({ subscriptionId, addressId }: { subscriptionId: number; addressId: number }) =>
      changeSubscriptionAddress(subscriptionId, addressId),
    onSuccess: refresh,
  })
}

export function useAdminUserSubscriptions(userId: number) {
  return useQuery({
    queryKey: subscriptionKeys.adminForUser(userId),
    queryFn: () => getAdminSubscriptions(undefined, userId),
  })
}

export function useCreateSubscription() {
  const refresh = useRefreshAfterChange()
  return useMutation({
    mutationFn: (request: CreateSubscriptionRequest) => createSubscription(request),
    onSuccess: refresh,
  })
}

export function useCancelSubscription() {
  const refresh = useRefreshAfterChange()
  return useMutation({
    mutationFn: (subscriptionId: number) => cancelSubscription(subscriptionId),
    onSuccess: refresh,
  })
}

/** #100: move an active subscription to another delivery time. */
export function useChangeDeliverySlot() {
  const refresh = useRefreshAfterChange()
  return useMutation({
    mutationFn: ({ subscriptionId, deliverySlotId }: { subscriptionId: number; deliverySlotId: number }) =>
      changeDeliverySlot(subscriptionId, deliverySlotId),
    onSuccess: refresh,
  })
}

