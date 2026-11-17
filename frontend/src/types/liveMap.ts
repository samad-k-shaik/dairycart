/**
 * Admin live map types (#111): mirror GET /admin/delivery-boys/locations
 * (`docs/05-api/api-contracts.md` → Delivery boys).
 */
import type { OrderStatus } from "./order.ts"

export type LivePosition = {
  latitude: number
  longitude: number
  accuracy_m: number | null
  /** When the server last received it (ISO). */
  updated_at: string
  /** No update for more than 2 minutes. */
  is_stale: boolean
}

export type LiveOrderPin = {
  order_id: number
  status: OrderStatus
  customer_name: string
  latitude: number
  longitude: number
}

export type LiveBoy = {
  delivery_boy_id: number
  name: string
  phone: string
  on_round: boolean
  round_started_at: string | null
  /** Null when not on a round, or no reading has arrived yet. */
  position: LivePosition | null
  /** His undelivered orders today that have a map pin. */
  orders: LiveOrderPin[]
}
