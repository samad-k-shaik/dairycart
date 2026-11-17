/**
 * Admin live map helpers (#111). Pure functions, tested in lib/liveMap.test.ts.
 * (Relative ".ts" imports so Node's test runner can load this.)
 */
import { STATUS_LABELS } from "./orderStatus.ts"
import { agoLabel } from "./tracking.ts"
import type { LiveBoy } from "../types/liveMap.ts"
import type { MapMarker } from "../types/map.ts"

/**
 * The pins for the map: one bike per delivery boy with a position (grey when stale), and
 * one house per undelivered order with a map pin. Ids are stable ("boy-3", "order-41"), so
 * MapView moves existing pins instead of redrawing them.
 */
export function liveMarkers(boys: LiveBoy[]): MapMarker[] {
  const markers: MapMarker[] = []
  for (const boy of boys) {
    for (const order of boy.orders) {
      markers.push({
        id: `order-${order.order_id}`,
        kind: "home",
        label: `#${order.order_id} ${order.customer_name} · ${STATUS_LABELS[order.status]} · ${boy.name}`,
        position: { lat: order.latitude, lng: order.longitude },
      })
    }
  }
  // Bikes after houses, so they are drawn on top.
  for (const boy of boys) {
    if (!boy.position) continue
    markers.push({
      id: `boy-${boy.delivery_boy_id}`,
      kind: "delivery-boy",
      label: boy.name,
      stale: boy.position.is_stale,
      position: { lat: boy.position.latitude, lng: boy.position.longitude },
    })
  }
  return markers
}

export type BoyStatus = { text: string; tone: "live" | "stale" | "waiting" | "off" }

/** One line under each delivery boy in the list next to the map. */
export function boyStatus(boy: LiveBoy, now: number): BoyStatus {
  if (!boy.on_round) return { text: "Not on a round", tone: "off" }
  if (!boy.position) return { text: "On a round · waiting for his first location", tone: "waiting" }
  const ago = agoLabel(Date.parse(boy.position.updated_at), now)
  if (boy.position.is_stale) return { text: `No update since ${ago} (phone locked or no signal?)`, tone: "stale" }
  return { text: `On a round · updated ${ago}`, tone: "live" }
}
