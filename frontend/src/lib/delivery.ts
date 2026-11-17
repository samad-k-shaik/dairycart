/**
 * Delivery boy page helpers (#109). Pure functions, tested in lib/delivery.test.ts.
 * (Relative ".ts" imports so Node's test runner can load this.)
 */
import type { DeliveryOrder, DeliveryStatus } from "../types/delivery.ts"
import type { OrderStatus } from "../types/order.ts"

export type DeliveryAction = { status: DeliveryStatus; label: string }

/**
 * The one button a delivery boy sees on an order, or null when there is nothing for him to
 * do. Same order as the backend's transition rules: CONFIRMED → OUT_FOR_DELIVERY → DELIVERED.
 */
export function nextDeliveryAction(status: OrderStatus): DeliveryAction | null {
  if (status === "CONFIRMED") return { status: "OUT_FOR_DELIVERY", label: "Start delivery" }
  if (status === "OUT_FOR_DELIVERY") return { status: "DELIVERED", label: "Mark delivered" }
  return null
}

/** A short note when there is no button: why he cannot act yet. */
export function waitingNote(status: OrderStatus): string | null {
  if (status === "PLACED") return "Waiting for the dairy to confirm this order."
  return null
}

export type DeliverySummary = { total: number; left: number; delivered: number }

/** "3 of 8 left" for the page header. */
export function summarize(orders: DeliveryOrder[]): DeliverySummary {
  const delivered = orders.filter((o) => o.status === "DELIVERED").length
  return { total: orders.length, left: orders.length - delivered, delivered }
}

/**
 * A link that opens the customer's pin in OpenStreetMap (works in any phone browser and
 * hands over to a maps app if one is installed). Null when the address has no pin.
 */
export function mapLink(order: Pick<DeliveryOrder, "delivery_latitude" | "delivery_longitude">): string | null {
  const { delivery_latitude: lat, delivery_longitude: lng } = order
  if (lat === null || lng === null) return null
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`
}
