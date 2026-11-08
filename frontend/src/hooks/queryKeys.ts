/**
 * Query keys for TanStack Query, kept in ONE place.
 *
 * TanStack Query caches every response under a "key" (an array). Two
 * components asking for the same key share ONE request and ONE cached result.
 * After a change (e.g. placing an order) we "invalidate" a key so that data
 * is fetched again and every screen showing it updates automatically.
 *
 * Keys are hierarchical: invalidating ['orders'] also invalidates
 * ['orders', 'detail', 101] and ['orders', 'byPhone', '98…'].
 */
import type { AdminOrderQuery } from '@/types/order'

export const queryKeys = {
  products: (includeUnavailable = false) => ['products', 'list', { includeUnavailable }] as const,
  product: (productId: number) => ['products', 'detail', productId] as const,

  orders: () => ['orders'] as const,
  order: (orderId: number) => ['orders', 'detail', orderId] as const,
  ordersByPhone: (phone: string) => ['orders', 'byPhone', phone] as const,

  adminOrders: (query: AdminOrderQuery = {}) => ['orders', 'admin', query] as const,
}
