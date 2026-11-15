/** TanStack Query cache keys for orders, in one place so hooks agree on them. */
import type { AdminOrderQuery } from "@/types/order"

export const orderKeys = {
  all: ["orders"] as const,
  detail: (orderId: number) => ["orders", "detail", orderId] as const,
  mine: ["orders", "mine"] as const, // GET /orders/mine (#90)
  admin: (query: AdminOrderQuery = {}) => ["orders", "admin", query] as const,
  // #104: the Orders board ("Load more" pages). Under "orders", so a status change refreshes it.
  board: (query: AdminOrderQuery) => ["orders", "board", query] as const,
}
