/**
 * Live location helpers for the delivery boy's phone (#110). Pure functions, tested in
 * lib/tracking.test.ts. (Relative ".ts" imports so Node's test runner can load this.)
 *
 * The browser's watchPosition can fire several times a second. We do NOT send every
 * reading: that wastes battery and data. The rule (shouldSend):
 *   - never more often than every 5 s;
 *   - otherwise send when 10 s have passed, OR he moved at least 20 m.
 * Readings less precise than 100 m (e.g. Wi-Fi only, indoors) are skipped.
 */
import type { LatLng } from "../types/map.ts"

export const MIN_GAP_MS = 5_000
export const MAX_GAP_MS = 10_000
export const MIN_MOVE_M = 20
export const MAX_ACCURACY_M = 100
/** Even when standing still, ask the phone again this often, so he never looks "stale". */
export const HEARTBEAT_MS = 20_000

export type SentReading = { position: LatLng; sentAt: number }

const EARTH_RADIUS_M = 6_371_000

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * Distance in metres between two points on Earth: the Haversine formula. It treats the
 * Earth as a sphere, which is accurate to well under 1 % at city distances.
 */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

/** Should this new reading be sent, given the last one we sent? (See the rule above.) */
export function shouldSend(last: SentReading | null, next: LatLng, now: number): boolean {
  if (!last) return true
  const elapsed = now - last.sentAt
  if (elapsed < MIN_GAP_MS) return false
  if (elapsed >= MAX_GAP_MS) return true
  return distanceMeters(last.position, next) >= MIN_MOVE_M
}

/** Skip readings the phone itself says are imprecise. Unknown accuracy is accepted. */
export function isAccurateEnough(accuracy: number | null | undefined): boolean {
  return accuracy === null || accuracy === undefined || accuracy <= MAX_ACCURACY_M
}

/** The body for PUT /delivery/me/location. */
export function toLocationBody(position: LatLng, accuracy: number | null, recordedAt: number) {
  return {
    latitude: Math.round(position.lat * 1e6) / 1e6,
    longitude: Math.round(position.lng * 1e6) / 1e6,
    accuracy_m: accuracy === null ? null : Math.round(accuracy),
    recorded_at: new Date(recordedAt).toISOString(),
  }
}

/** "just now", "25 s ago", "3 min ago". */
export function agoLabel(then: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - then) / 1000))
  if (seconds < 5) return "just now"
  if (seconds < 60) return `${seconds} s ago`
  return `${Math.floor(seconds / 60)} min ago`
}
