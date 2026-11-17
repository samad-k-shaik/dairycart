/**
 * useLeafletMap (#107, ADR-018): puts a Leaflet map inside a <div> that React renders.
 *
 * Why a hook and not react-leaflet? ADR-018 rejected react-leaflet (licence, extra dependency).
 * Leaflet is a normal JavaScript library: it does not know React. It wants a real DOM element
 * and then changes that element itself. So:
 * 1. React renders an empty <div> and gives us a ref to it (`containerRef`).
 * 2. After React has put the <div> on the page, `useEffect` creates the map inside it.
 * 3. The effect's cleanup calls `map.remove()`, so leaving the page (or React's StrictMode
 *    running effects twice in development) never leaves a second, broken map behind.
 * React must never render children INTO that <div>: Leaflet owns it.
 */
import { useEffect, useRef, useState } from "react"
import L from "leaflet"

import { DEFAULT_CENTER, DEFAULT_ZOOM, MAX_ZOOM, type TileConfig } from "@/lib/map"

export function useLeafletMap(tiles: TileConfig) {
  const containerRef = useRef<HTMLDivElement>(null)
  // State, not a ref: components must re-render once the map exists, to add their markers.
  const [map, setMap] = useState<L.Map | null>(null)

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const instance = L.map(element, {
      center: [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
      zoom: DEFAULT_ZOOM,
      // Off: otherwise scrolling the page with the mouse over the map zooms the map instead.
      // Zoom buttons, double-click and pinch-to-zoom on phones still work.
      scrollWheelZoom: false,
    })
    L.tileLayer(tiles.url, { attribution: tiles.attribution, maxZoom: MAX_ZOOM }).addTo(instance)

    // Leaflet measures its box once. If the box changes size later (a sheet opening, the phone
    // rotating), it must measure again, or parts of the map stay grey.
    const resizeObserver = new ResizeObserver(() => instance.invalidateSize())
    resizeObserver.observe(element)

    setMap(instance)
    return () => {
      resizeObserver.disconnect()
      instance.remove()
      setMap(null)
    }
  }, [tiles.url, tiles.attribution])

  return { containerRef, map }
}
