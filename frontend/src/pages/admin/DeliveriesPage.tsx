/**
 * Route: `/admin/deliveries?date=YYYY-MM-DD` (#101). What has to be delivered on one day.
 *
 * - Day picker (default today, India time), kept in the URL so the page can be shared or
 *   reloaded on the same day.
 * - Product totals for the day (what to load on the van; cancelled orders not counted).
 * - Status counts, and one card per order: the user, products, delivery time, total and
 *   a quick status change (same rules as the Orders page; cancelling restores stock).
 * A day = subscription deliveries for that date + one-time orders placed that day.
 */
import { Link, useSearchParams } from "react-router"
import { ChevronLeft, ChevronRight, Clock, Package, Repeat, ShoppingBag, Truck } from "lucide-react"

import { QuickStatusSelect } from "@/components/admin/QuickStatusSelect"
import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { StatusBadge } from "@/components/common/StatusBadge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useDeliveries } from "@/hooks/useAdminViews"
import { dayLabel, itemLabel, readDate } from "@/lib/deliveries"
import { formatCurrency } from "@/lib/format"
import { STATUS_LABELS } from "@/lib/orderStatus"
import { addDays, todayInIndia } from "@/lib/subscription"
import { ORDER_STATUSES } from "@/types/order"
import type { DeliveryRow } from "@/types/delivery"

function DeliveriesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const today = todayInIndia()
  const day = readDate(searchParams.get("date")) ?? today
  const query = useDeliveries(day)

  function goTo(next: string) {
    const params = new URLSearchParams(searchParams)
    if (next === today) params.delete("date")
    else params.set("date", next)
    setSearchParams(params)
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-h1 font-bold">Deliveries</h1>
        <p className="text-muted-foreground">
          Everything to deliver on one day: subscription deliveries for that date and one-time orders placed that
          day.
        </p>
      </div>

      {/* Day picker */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Choose a day">
        <Button variant="outline" size="icon-lg" aria-label="Previous day" onClick={() => goTo(addDays(day, -1))}>
          <ChevronLeft aria-hidden="true" />
        </Button>
        <label className="sr-only" htmlFor="deliveries-date">
          Day
        </label>
        <Input
          id="deliveries-date"
          type="date"
          className="h-11 w-auto"
          value={day}
          onChange={(e) => {
            const picked = readDate(e.target.value)
            if (picked) goTo(picked)
          }}
        />
        <Button variant="outline" size="icon-lg" aria-label="Next day" onClick={() => goTo(addDays(day, 1))}>
          <ChevronRight aria-hidden="true" />
        </Button>
        <span className="font-semibold" data-testid="day-label">
          {dayLabel(day, today)}
        </span>
        {day !== today && (
          <Button variant="ghost" className="h-11" onClick={() => goTo(today)}>
            Back to today
          </Button>
        )}
      </div>

      {query.isPending ? (
        <div className="space-y-3" aria-hidden="true">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      ) : query.isError ? (
        <ErrorState
          title="We could not load the deliveries"
          error={query.error}
          onRetry={() => query.refetch()}
          retrying={query.isFetching}
        />
      ) : query.data.deliveries.length === 0 ? (
        <EmptyState
          icon={Truck}
          title={`No deliveries ${day === today ? "today" : "on this day"}`}
          description="Subscription deliveries appear here once they are created, and one-time orders on the day they are placed."
        />
      ) : (
        <>
          <section aria-labelledby="totals-heading" className="space-y-3 rounded-2xl bg-surface p-4 shadow-card">
            <h2 id="totals-heading" className="flex items-center gap-2 text-h3 font-semibold">
              <Package className="size-5 text-primary" aria-hidden="true" />
              To load
            </h2>
            {query.data.product_totals.length === 0 ? (
              <p className="text-small text-muted-foreground">Nothing to load: every order is cancelled.</p>
            ) : (
              <ul className="flex flex-wrap gap-2" data-testid="product-totals">
                {query.data.product_totals.map((total) => (
                  <li
                    key={total.product_id}
                    className="rounded-full bg-primary-soft px-3 py-1.5 text-small font-semibold text-primary"
                  >
                    {total.product_name} {total.size} × {total.quantity}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-small text-muted-foreground" data-testid="status-counts">
              {ORDER_STATUSES.filter((s) => query.data.status_counts[s] > 0)
                .map((s) => `${STATUS_LABELS[s]} ${query.data.status_counts[s]}`)
                .join(" · ")}
            </p>
          </section>

          <ul className="space-y-3" aria-label={`Deliveries for ${dayLabel(day, today)}`}>
            {query.data.deliveries.map((row) => (
              <li key={row.order_id}>
                <DeliveryCard row={row} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function DeliveryCard({ row }: { row: DeliveryRow }) {
  const isSubscription = row.subscription_id !== null
  return (
    <article
      className="grid gap-3 rounded-2xl bg-surface p-4 shadow-card sm:grid-cols-[1fr_auto]"
      aria-label={`Order ${row.order_id} for ${row.customer_name}`}
    >
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {row.user_id !== null ? (
            <Link to={`/admin/users/${row.user_id}`} className="font-semibold text-primary hover:underline">
              {row.customer_name}
            </Link>
          ) : (
            <span className="font-semibold">{row.customer_name}</span>
          )}
          <StatusBadge status={row.status} />
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-small font-semibold text-muted-foreground">
            {isSubscription ? (
              <Repeat className="size-3.5" aria-hidden="true" />
            ) : (
              <ShoppingBag className="size-3.5" aria-hidden="true" />
            )}
            {isSubscription ? "Subscription" : "One-time"}
          </span>
        </div>
        <p className="text-small text-muted-foreground">
          {row.customer_phone}
          {row.username && ` · @${row.username}`} · Order #{row.order_id}
        </p>
        {row.delivery_slot && (
          <p className="flex items-center gap-1.5 text-small font-semibold">
            <Clock className="size-4 text-primary" aria-hidden="true" />
            {row.delivery_slot}
          </p>
        )}
        <ul className="text-small">
          {row.items.map((item) => (
            <li key={item.product_id}>{itemLabel(item)}</li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 sm:flex-col sm:items-end sm:justify-start">
        <span className="text-price font-extrabold">{formatCurrency(row.total_amount)}</span>
        <QuickStatusSelect key={row.status} orderId={row.order_id} status={row.status} />
      </div>
    </article>
  )
}

export default DeliveriesPage
