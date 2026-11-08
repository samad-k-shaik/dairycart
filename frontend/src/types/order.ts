/**
 * Order types – mirror the order endpoints in docs/05-api/api-contracts.md.
 * Field names are snake_case on purpose: they must match the JSON from the API.
 */

/**
 * The five order statuses. A "union type" means a value can ONLY be one of these
 * strings; TypeScript reports an error for typos like 'DELIVERD'.
 * Allowed changes between statuses live in src/lib/orderStatus.ts.
 */
export type OrderStatus =
  | 'PLACED'
  | 'CONFIRMED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'

/** Customer as returned inside an order. */
export interface Customer {
  customer_id: number
  name: string
  phone: string
}

/**
 * One line of an order. `unit_price` and `subtotal` are calculated by the
 * BACKEND from database prices (business rules BR-1, BR-2). The frontend only
 * displays them.
 */
export interface OrderItem {
  order_item_id: number
  product_id: number
  product_name: string
  size: string
  quantity: number
  unit_price: string // "60.00"
  subtotal: string // "120.00"
}

/** Full order: response of POST /orders, GET /orders/{id}, PATCH …/status. */
export interface Order {
  order_id: number
  customer: Customer
  order_date: string // ISO 8601 UTC, e.g. "2026-11-07T04:30:00Z"
  status: OrderStatus
  items: OrderItem[]
  total_amount: string // backend-calculated total
}

/** Short order row for the customer's history list: GET /orders?phone= (ADR-005). */
export interface OrderSummary {
  order_id: number
  order_date: string
  status: OrderStatus
  total_amount: string
  item_count: number
}

/** Order row in the admin table: items of GET /admin/orders. */
export interface AdminOrderRow {
  order_id: number
  customer_name: string
  customer_phone: string
  order_date: string
  status: OrderStatus
  total_amount: string
  item_count: number
}

/** One page of admin orders plus counts for the dashboard. */
export interface AdminOrderPage {
  items: AdminOrderRow[]
  page: number
  page_size: number
  total: number // number of orders matching the filter (for pagination)
  /** Counts across ALL orders, ignoring the filter. Feeds the dashboard cards. */
  status_counts: Record<OrderStatus, number>
}

/**
 * What the frontend SENDS to POST /orders.
 * Notice: NO prices and NO totals. The backend looks up prices itself, so a
 * user editing the request in dev tools cannot change what they pay.
 */
export interface CreateOrderRequest {
  customer: { name: string; phone: string }
  items: { product_id: number; quantity: number }[]
}

/** Query options for the admin order list. */
export interface AdminOrderQuery {
  status?: OrderStatus
  page?: number
  page_size?: number
}
