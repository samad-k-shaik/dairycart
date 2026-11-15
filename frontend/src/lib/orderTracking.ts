/**
 * Customer order tracking helpers (#112). Pure functions, tested in lib/orderTracking.test.ts.
 * (Relative ".ts" imports so Node's test runner can load this.)
 */
import { agoLabel } from "./tracking.ts"
import type { MapMarker } from "../types/map.ts"
import type { OrderTracking } from "../types/tracking.ts"

/** The home pin and the delivery boy's bike, when known. */
export function trackingMarkers(tracking: OrderTracking): MapMarker[] {
  const markers: MapMarker[] = []
  if (tracking.destination) {
    markers.push({
      id: "home",
      kind: "home",
      label: "Your delivery address",
      position: { lat: tracking.destination.latitude, lng: tracking.destination.longitude },
    })
  }
  if (tracking.delivery_boy) {
    markers.push({
      id: "boy",
      kind: "delivery-boy",
      label: tracking.delivery_boy.name,
      stale: tracking.delivery_boy.is_stale,
      position: { lat: tracking.delivery_boy.position.latitude, lng: tracking.delivery_boy.position.longitude },
    })
  }
  return markers
}

/** The headline under the map, e.g. "Ravi is about 8 min away · 2.4 km". */
export function trackingHeadline(tracking: OrderTracking, now: number): string {
  const boy = tracking.delivery_boy
  if (!boy) return "Your order is on its way. The delivery boy's location is not available right now."
  if (boy.is_stale) return `${boy.name} was last seen ${agoLabel(Date.parse(boy.updated_at), now)}.`
  if (tracking.eta_minutes !== null && tracking.distance_km !== null) {
    return `${boy.name} is about ${tracking.eta_minutes} min away · ${tracking.distance_km.toFixed(1)} km`
  }
  return `${boy.name} is on the way.`
}
