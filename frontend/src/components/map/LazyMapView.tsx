/**
 * LazyMapView (#107): use this on pages instead of MapView.
 *
 * `lazy(() => import(...))` tells Vite to put MapView and Leaflet (~40 kB + CSS) in a separate
 * file that the browser downloads only when this component is first shown. Customers who never
 * open a map never download Leaflet. Same idea as the lazy admin Income page with Recharts
 * (ADR-016). While the file loads, a grey placeholder of the same size keeps the layout steady.
 */
import { lazy, Suspense } from "react"

import { DEFAULT_MAP_HEIGHT_CLASS } from "@/lib/map"
import { cn } from "@/lib/utils"
// "import type" is removed from the built code, so it does not pull MapView into this file.
import type { MapViewProps } from "./MapView"

const MapView = lazy(() => import("./MapView"))

function LazyMapView(props: MapViewProps) {
  return (
    <Suspense
      fallback={
        <div
          className={cn("animate-pulse rounded-2xl bg-muted", DEFAULT_MAP_HEIGHT_CLASS, props.className)}
          aria-hidden="true"
        />
      }
    >
      <MapView {...props} />
    </Suspense>
  )
}

export default LazyMapView
