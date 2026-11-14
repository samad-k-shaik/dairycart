/**
 * Admin daily deliveries and user details hooks (#101).
 *
 * The keys start with "orders", so a status change (useUpdateOrderStatus invalidates every
 * "orders" query) also refreshes the Deliveries page and the user's totals and orders.
 */
import { useQuery } from "@tanstack/react-query"

import { orderKeys } from "@/hooks/orderKeys"
import { getAdminUser, getAdminUserOrders, getDeliveries } from "@/services/adminService"

export const adminViewKeys = {
  deliveries: (date: string, boy = "") => [...orderKeys.all, "deliveries", date, boy] as const,
  user: (userId: number) => [...orderKeys.all, "admin-user", userId] as const,
  userOrders: (userId: number) => [...orderKeys.all, "admin-user", userId, "orders"] as const,
}

export function useDeliveries(date: string, boy = "") {
  return useQuery({
    queryKey: adminViewKeys.deliveries(date, boy),
    queryFn: () => getDeliveries(date, boy),
    placeholderData: (previous) => previous, // keep the page steady while switching filters
  })
}

export function useAdminUser(userId: number) {
  return useQuery({ queryKey: adminViewKeys.user(userId), queryFn: () => getAdminUser(userId) })
}

export function useAdminUserOrders(userId: number) {
  return useQuery({ queryKey: adminViewKeys.userOrders(userId), queryFn: () => getAdminUserOrders(userId) })
}
