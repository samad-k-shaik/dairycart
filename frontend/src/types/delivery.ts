/**
 * Delivery boy app types (#109): mirror `docs/05-api/api-contracts.md` → Delivery boy app.
 */
import type { DeliveryArea } from "./deliveryBoy.ts"
import type { OrderStatus } from "./order.ts"
import type { Money } from "./product.ts"

/** GET /delivery/me */
export type DeliveryMe = {
  delivery_boy_id: number
  name: string
  phone: string
  areas: DeliveryArea[]
  /** #110: sharing his location now, and since when. */
  on_round: boolean
  round_started_at: string | null
}

/** POST /delivery/me/round/start and /stop (#110). */
export type RoundState = { on_round: boolean; round_started_at: string | null }

/** PUT /delivery/me/location body (#110). */
export type LocationBody = {
  latitude: number
  longitude: number
  accuracy_m: number | null
  /** ISO time when the phone read it. */
  recorded_at: string
}

export type DeliveryLine = {
  product_name: string
  size: string
  quantity: number
}

/** One order on GET /delivery/me/orders. */
export type DeliveryOrder = {
  order_id: number
  status: OrderStatus
  /** Null for one-time orders (delivered the day they are placed). */
  delivery_date: string | null
  delivery_slot: string | null
  /** The delivery contact typed at checkout. */
  customer_name: string
  customer_phone: string
  delivery_address: string | null
  delivery_pincode: string | null
  /** #108: the customer's map pin, if any. */
  delivery_latitude: number | null
  delivery_longitude: number | null
  /** To collect on delivery (cash on delivery). */
  total_amount: Money
  items: DeliveryLine[]
}

/** The two statuses a delivery boy may set. */
export type DeliveryStatus = "OUT_FOR_DELIVERY" | "DELIVERED"
