/**
 * Route: `/admin/live-map` (#111). Where the delivery boys are right now.
 *
 * Read path of live tracking: the page asks GET /admin/delivery-boys/locations every 10 s
 * (TanStack Query `refetchInterval`, paused while the browser tab is hidden). Bikes glide to
 * their new position; a grey bike has not sent an update for 2 minutes. Houses are today's
 * undelivered orders that have a map pin. The view is framed once and then left to the admin.
 */
import { useEffect, useState } from "react"
import { Link } from "react-router"
import { Bike, Phone } from "lucide-react"

import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import LazyMapView from "@/components/map/LazyMapView"
import { Badge } from "@/components/ui/badge"
import { useLiveMap } from "@/hooks/useDeliveryBoys"
import { boyStatus, liveMarkers, type BoyStatus } from "@/lib/liveMap"
import { cn } from "@/lib/utils"
import type { LiveBoy } from "@/types/liveMap"

const TONE: Record<BoyStatus["tone"], string> = {
  live: "bg-success",
  stale: "bg-muted-foreground",
  waiting: "bg-warning",
  off: "bg-border",
}

function LiveMapPage() {
  const query = useLiveMap()
  const now = useNow()

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-h1 font-bold">Live map</h1>
        <p className="text-muted-foreground">
          Delivery boys on a round, updated every 10 seconds. Houses are today's orders still to deliver (only those
          with a map pin).
        </p>
      </div>

      {query.isPending ? (
        <div className="h-[60vh] animate-pulse rounded-2xl bg-muted" aria-hidden="true" />
      ) : query.isError ? (
        <ErrorState title="Could not load the live map" error={query.error} onRetry={() => query.refetch()} retrying={query.isFetching} />
      ) : query.data.length === 0 ? (
        <EmptyState
          icon={Bike}
          title="No active delivery boys"
          description="Add delivery boys and give them a login on the Delivery boys page."
          action={
            <Link to="/admin/delivery-boys" className="font-semibold text-primary hover:underline">
              Go to Delivery boys
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <LazyMapView
            label="Live map of delivery boys and today's orders"
            markers={liveMarkers(query.data)}
            autoFrame="once"
            className="h-[60vh] min-h-80"
          />
          <ul className="space-y-2" aria-label="Delivery boys">
            {query.data.map((boy) => (
              <li key={boy.delivery_boy_id}>
                <BoyRow boy={boy} now={now} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function BoyRow({ boy, now }: { boy: LiveBoy; now: number }) {
  const status = boyStatus(boy, now)
  return (
    <article className="space-y-1 rounded-2xl bg-surface p-3 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <span className={cn("size-2.5 shrink-0 rounded-full", TONE[status.tone])} aria-hidden="true" />
          {boy.name}
        </h2>
        {boy.orders.length > 0 && (
          <Badge className="bg-primary-soft font-semibold text-primary">{boy.orders.length} to deliver</Badge>
        )}
      </div>
      <p className={cn("text-small", status.tone === "stale" ? "text-danger" : "text-muted-foreground")}>{status.text}</p>
      <a href={`tel:+91${boy.phone}`} className="inline-flex min-h-11 items-center gap-1.5 text-small font-semibold text-primary">
        <Phone className="size-3.5" aria-hidden="true" />
        Call {boy.phone}
      </a>
    </article>
  )
}

/** The current time, every 5 s (for "updated 25 s ago" between two refreshes). */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 5_000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}

export default LiveMapPage
