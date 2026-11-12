/**
 * Order types: mirror `docs/05-api/api-contracts.md` field-for-field.
 * Field names stay in snake_case exactly as the API sends them.
 */
// Explicit ".ts" so Node's test runner can load this file too (see mockData.test.ts).
import type { Money } from "./product.ts"

/**
 * All order statuses, in lifecycle order.
 * `as const` makes this a fixed, read-only list of these exact strings.
 */
export const ORDER_STATUSES = [
  "PLACED",
  "CONFIRMED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
] as const

/**
 * A "union type": OrderStatus can only be one of the five strings above.
 * Writing `status: "SHIPPED"` anywhere becomes a compile error.
 */
export type OrderStatus = (typeof ORDER_STATUSES)[number]

/** Dates are ISO 8601 UTC strings, e.g. "2026-11-07T04:30:00Z". */
export type IsoDateTime = string

export type Customer = {
  customer_id: number
  name: string
  phone: string
}

/** One line of an order. `unit_price` is a snapshot of the price at order time (BR-1). */
export type OrderItem = {
  order_item_id: number
  product_id: number
  product_name: string
  size: string
  quantity: number
  unit_price: Money
  subtotal: Money
}

/** Full order: POST /orders (201), GET /orders/{id}, PATCH /admin/orders/{id}/status. */
export type Order = {
  order_id: number
  customer: Customer
  order_date: IsoDateTime
  status: OrderStatus
  items: OrderItem[]
  total_amount: Money
  /** #97: the subscription this order came from; null for a one-time order. */
  subscription_id?: number | null
  /** #97: the day ("2026-11-21") a subscription order is for; null for one-time orders. */
  delivery_date?: string | null
}

/** "My orders" row: GET /orders/mine (#90). */
export type OrderSummary = {
  order_id: number
  order_date: IsoDateTime
  status: OrderStatus
  total_amount: Money
  item_count: number
  /** #97: set for orders created from a subscription. */
  subscription_id?: number | null
}

/** Admin order list row: one entry of GET /admin/orders `items`. */
export type AdminOrderSummary = {
  order_id: number
  customer_name: string
  customer_phone: string
  order_date: IsoDateTime
  status: OrderStatus
  total_amount: Money
  item_count: number
  /** #97: set for orders created from a subscription. */
  subscription_id?: number | null
}

/** GET /admin/orders response (one page plus dashboard counts). */
export type AdminOrderPage = {
  items: AdminOrderSummary[]
  page: number
  page_size: number
  total: number
  /** Counts across ALL orders, ignoring filters. Feeds the admin dashboard. */
  status_counts: Record<OrderStatus, number>
}

/** Query options for GET /admin/orders. */
export type AdminOrderQuery = {
  status?: OrderStatus
  page?: number
  page_size?: number
}

/**
 * POST /orders request body.
 * Note what is NOT here: no prices, no totals. The backend calculates them (BR-2).
 */
export type CreateOrderRequest = {
  customer: {
    name: string
    phone: string
  }
  items: {
    product_id: number
    quantity: number
  }[]
}

/** PATCH /admin/orders/{id}/status request body. */
export type UpdateOrderStatusRequest = {
  status: OrderStatus
}
