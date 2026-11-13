/**
 * Admin daily deliveries types (#101): mirror `docs/05-api/api-contracts.md` → Deliveries.
 * (Relative ".ts" imports so Node's test runner can load this file.)
 */
import type { OrderStatus } from "./order.ts"
import type { Money } from "./product.ts"

export type DeliveryItem = {
  product_id: number
  product_name: string
  size: string
  quantity: number
}

/** One order to deliver that day. */
export type DeliveryRow = {
  order_id: number
  user_id: number | null
  /** null only for old guest orders (before accounts). */
  username: string | null
  customer_name: string
  customer_phone: string
  /** Set for subscription deliveries, null for one-time orders. */
  subscription_id: number | null
  /** "Morning, 8:00 AM – 9:00 AM" (subscriptions only). */
  delivery_slot: string | null
  status: OrderStatus
  total_amount: Money
  items: DeliveryItem[]
}

/** How many of one product go out that day (cancelled orders not counted). */
export type ProductTotal = DeliveryItem

/** GET /admin/deliveries?date=YYYY-MM-DD */
export type DayDeliveries = {
  date: string
  status_counts: Record<OrderStatus, number>
  product_totals: ProductTotal[]
  deliveries: DeliveryRow[]
}
