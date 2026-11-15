/**
 * MapView (#107, ADR-018): an OpenStreetMap map with pins, used by every map screen in M12.
 *
 *   <LazyMapView label="Your delivery address" markers={[{ id: "home", kind: "home", ... }]} />
 *
 * Pages should use LazyMapView, not this file directly: it loads Leaflet (~40 kB) only when a
 * map is actually shown.
 *
 * How it works:
 * - useLeafletMap creates the Leaflet map in a <div> (see that hook for why).
 * - Decisions (where to look, which colour a pin has) come from lib/map.ts, which is tested.
 * - Each pin is a Leaflet "divIcon": Leaflet positions an empty <div> on the map, and React
 *   draws our Lucide icon INTO that <div> with createPortal. So pins use the same icons and
 *   design tokens as the rest of the app, and Leaflet's default marker images (which break
 *   with Vite) are never used.
 * - #108: with `onPick`, tapping the map or dragging a home pin reports a new position
 *   (the address form uses this to place the customer's pin).
 */
import "leaflet/dist/leaflet.css"
import "./map.css"

import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import L from "leaflet"
import { Bike, House } from "lucide-react"

import { useLeafletMap } from "@/hooks/useLeafletMap"
import {
  chooseFraming,
  DEFAULT_MAP_HEIGHT_CLASS,
  isValidLatLng,
  markerLook,
  readTileConfig,
} from "@/lib/map"
import { cn } from "@/lib/utils"
import type { LatLng, MapMarker } from "@/types/map"

/** Read once: VITE_* values are fixed when the app is built. */
const TILES = readTileConfig(import.meta.env)

/** Size of a pin in pixels; its centre sits exactly on the coordinates. */
const PIN_SIZE = 36

export interface MapViewProps {
  /** What the map shows, for screen readers, e.g. "Map of your delivery address". */
  label: string
  markers: MapMarker[]
  /** Optional: where to look. Without it the map frames the pins (see chooseFraming). */
  center?: LatLng
  zoom?: number
  /** Height (and other layout) classes; the default is h-72 (288 px). */
  className?: string
  /**
   * #108: pick mode. Tapping the map, or dragging a home pin, calls this with the new
   * position. The page then updates `markers`, which moves the pin.
   */
  onPick?: (position: LatLng) => void
}

/** A pin's Leaflet layer plus the <div> that React draws the icon into. */
interface DrawnPin {
  marker: MapMarker
  element: HTMLDivElement
}

function MapView({ label, markers, center, zoom, className, onPick }: MapViewProps) {
  const { containerRef, map } = useLeafletMap(TILES)
  const [pins, setPins] = useState<DrawnPin[]>([])
  const pickable = onPick !== undefined
  // The latest onPick, read by Leaflet's event handlers. A ref (not an effect dependency)
  // because pages usually pass a new function on every render; re-adding the handlers each
  // time would be wasteful.
  const onPickRef = useRef(onPick)
  useEffect(() => {
    onPickRef.current = onPick
  })

  // Pages often pass a NEW array on every render, even when nothing changed. Comparing the
  // content (as JSON) instead of the array itself means pins are redrawn and the map is
  // re-framed only when a pin really changed, so the map does not jump back while the user
  // is dragging it.
  const markersKey = JSON.stringify(markers)
  const stableMarkers = useMemo(() => JSON.parse(markersKey) as MapMarker[], [markersKey])
  const framingKey = JSON.stringify(chooseFraming(stableMarkers, center, zoom))

  // Draw the pins.
  useEffect(() => {
    if (!map) return
    const drawn = stableMarkers
      .filter((marker) => isValidLatLng(marker.position))
      .map((marker) => {
        const look = markerLook(marker)
        const element = document.createElement("div")
        // Popup text is set as TEXT, never as HTML: labels can contain names typed by users,
        // and HTML there could run someone else's script (XSS).
        const popup = document.createElement("span")
        popup.textContent = look.description

        const layer = L.marker([marker.position.lat, marker.position.lng], {
          icon: L.divIcon({
            html: element,
            className: "map-pin",
            iconSize: [PIN_SIZE, PIN_SIZE],
            iconAnchor: [PIN_SIZE / 2, PIN_SIZE / 2],
            popupAnchor: [0, -PIN_SIZE / 2],
          }),
          title: look.description, // tooltip on hover, name for screen readers
          keyboard: true, // reachable with Tab, opens its popup with Enter
          draggable: pickable && marker.kind === "home", // #108: drag to adjust
        })
          .bindPopup(popup)
          .addTo(map)
        layer.on("dragend", () => {
          const { lat, lng } = layer.getLatLng()
          onPickRef.current?.({ lat, lng })
        })
        return { marker, element, layer }
      })

    setPins(drawn.map(({ marker, element }) => ({ marker, element })))
    return () => {
      drawn.forEach(({ layer }) => layer.remove())
      setPins([])
    }
  }, [map, stableMarkers, pickable])

  // #108: in pick mode, a tap on the map places the pin there.
  useEffect(() => {
    if (!map || !pickable) return
    const handleClick = (event: L.LeafletMouseEvent) => onPickRef.current?.({ lat: event.latlng.lat, lng: event.latlng.lng })
    map.on("click", handleClick)
    return () => {
      map.off("click", handleClick)
    }
  }, [map, pickable])

  // Frame the content: one pin → zoom in, several → fit all, none → whole city.
  useEffect(() => {
    if (!map) return
    const framing = JSON.parse(framingKey) as ReturnType<typeof chooseFraming>
    if (framing.kind === "fit") {
      const { southWest, northEast } = framing.bounds
      map.fitBounds(
        [
          [southWest.lat, southWest.lng],
          [northEast.lat, northEast.lng],
        ],
        { padding: [PIN_SIZE + 8, PIN_SIZE + 8], maxZoom: 16 },
      )
    } else {
      // In pick mode, keep the user's zoom if they zoomed in closer to place the pin
      // precisely; otherwise every tap would zoom back out.
      const targetZoom = pickable ? Math.max(framing.zoom, map.getZoom()) : framing.zoom
      map.setView([framing.center.lat, framing.center.lng], targetZoom)
    }
  }, [map, framingKey, pickable])

  return (
    // "isolate" keeps Leaflet's high z-index values (up to 1000) INSIDE this box, so the map
    // never covers the app's header, sheets or dialogs.
    <div className={cn("relative isolate overflow-hidden rounded-2xl bg-muted shadow-card", DEFAULT_MAP_HEIGHT_CLASS, className)}>
      <div ref={containerRef} role="region" aria-label={label} className={cn("size-full", pickable && "map-pickable")} />
      {pins.map(({ marker, element }) => createPortal(<PinIcon marker={marker} />, element, marker.id))}
    </div>
  )
}

function PinIcon({ marker }: { marker: MapMarker }) {
  const look = markerLook(marker)
  const Icon = look.icon === "house" ? House : Bike
  return (
    <span
      className={cn(
        "flex size-9 items-center justify-center rounded-full border-2 border-white shadow-lg",
        look.className,
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
    </span>
  )
}

export default MapView
