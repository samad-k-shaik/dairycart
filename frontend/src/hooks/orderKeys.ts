/** TanStack Query cache keys for orders, in one place so hooks agree on them. */
import type { AdminOrderQuery } from "@/types/order"

export const orderKeys = {
  all: ["orders"] as const,
  detail: (orderId: number) => ["orders", "detail", orderId] as const,
  byPhone: (phone: string) => ["orders", "by-phone", phone] as const,
  admin: (query: AdminOrderQuery = {}) => ["orders", "admin", query] as const,
}
