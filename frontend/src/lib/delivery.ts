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

type NavigationTarget = Pick<
  DeliveryOrder,
  "delivery_latitude" | "delivery_longitude" | "delivery_address" | "delivery_pincode"
>

/**
 * #134: a Google Maps directions link to the customer, for the "Navigate" button.
 *
 * It is a plain URL (no API key, no billing, no script in our app — ADR-018 amendment).
 * On a phone it opens the Google Maps app with directions ready; on a laptop, a browser tab.
 *
 * - map pin set → the exact pin (most accurate, #108)
 * - no pin      → the address text; the PIN code is added if the text does not have it
 * - neither     → null, so the page shows no button
 *
 * URLSearchParams encodes spaces, commas, "/" and "#" so an address cannot break the link.
 */
export function navigationLink(order: NavigationTarget): string | null {
  const { delivery_latitude: lat, delivery_longitude: lng, delivery_pincode: pincode } = order
  const address = order.delivery_address?.trim() ?? ""

  let destination: string
  if (lat !== null && lng !== null) {
    destination = `${lat},${lng}`
  } else if (address) {
    destination = pincode && !address.includes(pincode) ? `${address}, ${pincode}` : address
  } else {
    return null
  }

  const params = new URLSearchParams({ api: "1", destination })
  return `https://www.google.com/maps/dir/?${params.toString()}`
}
