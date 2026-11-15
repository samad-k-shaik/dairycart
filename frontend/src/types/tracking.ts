/**
 * Customer order tracking types (#112): mirror GET /orders/{id}/tracking.
 */
import type { OrderStatus } from "./order.ts"

export type TrackingPoint = { latitude: number; longitude: number }

export type OrderTracking = {
  order_id: number
  status: OrderStatus
  /** Only while out for delivery and the delivery boy is sharing his location. */
  delivery_boy: {
    /** First name only. */
    name: string
    position: TrackingPoint
    updated_at: string
    is_stale: boolean
  } | null
  /** The order's map pin, if the address had one. */
  destination: TrackingPoint | null
  distance_km: number | null
  eta_minutes: number | null
}
