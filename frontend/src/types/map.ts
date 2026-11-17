/** Map types (#107, ADR-018), shared by MapView and the later map screens (#108–#112). */

/** A point on Earth in degrees. Latitude: -90…90 (north/south), longitude: -180…180 (east/west). */
export interface LatLng {
  lat: number
  lng: number
}

/** What a pin stands for. It decides the icon and the colour. */
export type MapMarkerKind = "home" | "delivery-boy"

export interface MapMarker {
  /** Unique within one map (React key, and later used to move a pin instead of redrawing it). */
  id: string
  position: LatLng
  /** Shown in the pin's popup and read by screen readers, e.g. "Ravi Kumar". Plain text, never HTML. */
  label: string
  kind: MapMarkerKind
  /** A delivery boy whose last position is old (the 2-minute rule comes in #111): drawn grey. */
  stale?: boolean
}
