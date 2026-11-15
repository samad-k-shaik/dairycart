/**
 * OrderTrackingPanel (#112): "Where is my order?" on the order details page, shown only
 * while the order is out for delivery. Asks GET /orders/{id}/tracking every 10 s and shows
 * the delivery boy and the home on a map, with the distance and an estimated arrival time.
 * When the order is delivered, the whole page is refreshed (the panel then disappears).
 */
import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Navigation } from "lucide-react"

import LazyMapView from "@/components/map/LazyMapView"
import { orderKeys } from "@/hooks/orderKeys"
import { useOrderTracking } from "@/hooks/useOrderTracking"
import { trackingHeadline, trackingMarkers } from "@/lib/orderTracking"

export function OrderTrackingPanel({ orderId }: { orderId: number }) {
  const tracking = useOrderTracking(orderId)
  const now = useNow()
  const queryClient = useQueryClient()
  const status = tracking.data?.status

  // The status moved on (e.g. DELIVERED): reload the order so the whole page shows it.
  useEffect(() => {
    if (status && status !== "OUT_FOR_DELIVERY") {
      void queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId), exact: true })
    }
  }, [status, orderId, queryClient])

  return (
    <section aria-labelledby="tracking-heading" className="space-y-3 rounded-2xl bg-surface p-4 shadow-card md:p-5">
      <h2 id="tracking-heading" className="flex items-center gap-2 text-h3 font-bold">
        <Navigation className="size-5 text-primary" aria-hidden="true" />
        Track your order
      </h2>
      {tracking.isPending ? (
        <div className="h-64 animate-pulse rounded-2xl bg-muted" aria-hidden="true" />
      ) : tracking.isError ? (
        <p className="text-small text-muted-foreground">Tracking is not available right now.</p>
      ) : (
        <>
          <p className="font-semibold" aria-live="polite">
            {trackingHeadline(tracking.data, now)}
          </p>
          {trackingMarkers(tracking.data).length > 0 && (
            <LazyMapView
              label="Map with your delivery address and the delivery boy"
              markers={trackingMarkers(tracking.data)}
              className="h-64"
            />
          )}
          {tracking.data.distance_km !== null && (
            <p className="text-small text-muted-foreground">
              Distance in a straight line; the road may be a little longer.
            </p>
          )}
        </>
      )}
    </section>
  )
}

/** The current time, every 5 s (for "last seen 25 s ago" between two refreshes). */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 5_000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}
