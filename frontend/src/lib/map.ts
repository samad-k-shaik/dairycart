/**
 * Map helpers (#107, ADR-018). Pure functions with no Leaflet import, tested in lib/map.test.ts.
 * (Relative ".ts" imports so Node's test runner can load this.)
 *
 * MapView (components/map) uses them to decide WHAT to draw; Leaflet only does the drawing.
 * Keeping the decisions here means they can be tested without a browser.
 */
import type { LatLng, MapMarker } from "../types/map.ts"

/** OpenStreetMap's standard tile server: free, light use only, attribution required (ADR-018). */
export const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

/** Where a map opens when it has nothing to show: Hyderabad, the dairy's city. */
export const DEFAULT_CENTER: LatLng = { lat: 17.385, lng: 78.4867 }
/** Zoom 12 shows a whole city; 15 shows a few streets; 19 is the closest OpenStreetMap allows. */
export const DEFAULT_ZOOM = 12
export const SINGLE_MARKER_ZOOM = 15
export const MAX_ZOOM = 19

/** Height of a map when the page does not choose one. Leaflet needs a fixed height, or it draws nothing. */
export const DEFAULT_MAP_HEIGHT_CLASS = "h-72"

export interface TileConfig {
  url: string
  attribution: string
}

/**
 * The tile server to use, from VITE_MAP_TILE_URL / VITE_MAP_ATTRIBUTION, falling back to
 * OpenStreetMap. A URL without the {z}, {x} and {y} placeholders cannot work (every tile would be
 * the same address), so it falls back too instead of showing a blank grey map.
 */
export function readTileConfig(env: {
  VITE_MAP_TILE_URL?: string
  VITE_MAP_ATTRIBUTION?: string
}): TileConfig {
  const url = env.VITE_MAP_TILE_URL?.trim() ?? ""
  const usable = ["{z}", "{x}", "{y}"].every((part) => url.includes(part))
  return {
    url: usable ? url : OSM_TILE_URL,
    attribution: env.VITE_MAP_ATTRIBUTION?.trim() || OSM_ATTRIBUTION,
  }
}

/** True for a real point: finite numbers within the latitude and longitude ranges. */
export function isValidLatLng(point: LatLng): boolean {
  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    point.lat >= -90 &&
    point.lat <= 90 &&
    point.lng >= -180 &&
    point.lng <= 180
  )
}

export interface Bounds {
  southWest: LatLng
  northEast: LatLng
}

/** The smallest box around all valid points, or null when there is none. */
export function boundsOf(points: LatLng[]): Bounds | null {
  const valid = points.filter(isValidLatLng)
  if (valid.length === 0) return null
  const lats = valid.map((p) => p.lat)
  const lngs = valid.map((p) => p.lng)
  return {
    southWest: { lat: Math.min(...lats), lng: Math.min(...lngs) },
    northEast: { lat: Math.max(...lats), lng: Math.max(...lngs) },
  }
}

/** How the map should frame its content: a centre + zoom, or "fit this box". */
export type MapFraming =
  | { kind: "center"; center: LatLng; zoom: number }
  | { kind: "fit"; bounds: Bounds }

/**
 * Decide what the map shows first:
 * 1. the page chose a centre → use it;
 * 2. one pin → zoom in on it;
 * 3. several pins → fit them all on screen;
 * 4. nothing → the whole city.
 */
export function chooseFraming(markers: MapMarker[], center?: LatLng, zoom?: number): MapFraming {
  if (center && isValidLatLng(center)) {
    return { kind: "center", center, zoom: zoom ?? DEFAULT_ZOOM }
  }
  const points = markers.map((m) => m.position).filter(isValidLatLng)
  if (points.length === 1) {
    return { kind: "center", center: points[0], zoom: zoom ?? SINGLE_MARKER_ZOOM }
  }
  const bounds = boundsOf(points)
  if (bounds) return { kind: "fit", bounds }
  return { kind: "center", center: DEFAULT_CENTER, zoom: zoom ?? DEFAULT_ZOOM }
}

export interface MarkerLook {
  icon: "house" | "bike"
  /** Design-system colour classes for the round pin. */
  className: string
  /** Full sentence for the popup and screen readers. */
  description: string
}

/**
 * Icon and colour of a pin (design system): home = primary blue, delivery boy = amber
 * (the OUT_FOR_DELIVERY colour), a stale delivery boy = grey.
 */
export function markerLook(marker: MapMarker): MarkerLook {
  if (marker.kind === "home") {
    return {
      icon: "house",
      className: "bg-primary text-primary-foreground",
      description: `Delivery address: ${marker.label}`,
    }
  }
  if (marker.stale) {
    return {
      icon: "bike",
      className: "bg-muted-foreground text-white",
      description: `Delivery boy: ${marker.label} (location not updated recently)`,
    }
  }
  return {
    icon: "bike",
    className: "bg-warning text-white",
    description: `Delivery boy: ${marker.label}`,
  }
}
