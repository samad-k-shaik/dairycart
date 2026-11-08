/**
 * Route: `/admin` (FR-A1).
 * Stat cards (total, today, one per status) and the 5 most recent orders.
 *
 * Where the numbers come from:
 * - Per-status counts: `status_counts` in the GET /admin/orders response (counts ALL orders).
 * - Total: the sum of those counts.
 * - Today: the API has no "today" figure, so we count orders whose IST date is today among
 *   the latest 100 (the largest page the API allows). Enough for the POC; a real
 *   backend field would be needed once there are more than 100 orders.
 */
import { Link } from "react-router"
import { CalendarDays, CheckCircle2, ChevronRight, ClipboardList, PackageCheck, ShoppingBag, Truck, XCircle, type LucideIcon } from "lucide-react"

import { StatCard } from "@/components/common/StatCard"
import { StatusBadge } from "@/components/common/StatusBadge"
import { Button } from "@/components/ui/button"
import { useAdminOrders } from "@/hooks/useAdminOrders"
import { countOrdersOnIstDay, totalFromStatusCounts } from "@/lib/dashboard"
import { formatCurrency, formatDateTime } from "@/lib/format"
import { STATUS_LABELS } from "@/lib/orderStatus"
import { ORDER_STATUSES, type OrderStatus } from "@/types/order"

const STATUS_ICONS: Record<OrderStatus, { icon: LucideIcon; className: string }> = {
  PLACED: { icon: ShoppingBag, className: "bg-primary-soft text-primary" },
  CONFIRMED: { icon: PackageCheck, className: "bg-indigo-50 text-indigo-700" },
  OUT_FOR_DELIVERY: { icon: Truck, className: "bg-amber-50 text-amber-700" },
  DELIVERED: { icon: CheckCircle2, className: "bg-green-50 text-green-700" },
  CANCELLED: { icon: XCircle, className: "bg-red-50 text-red-700" },
}

const RECENT_COUNT = 5

function DashboardPage() {
  const { data, isPending, isError, refetch } = useAdminOrders({ page_size: 100 })

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-h1 font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Today at a glance.</p>
      </div>

      {isPending ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface shadow-card" />
          ))}
        </div>
      ) : isError ? (
        <div role="alert" className="space-y-3 rounded-2xl bg-surface p-6 text-center shadow-card">
          <p className="font-semibold">We could not load the dashboard.</p>
          <Button variant="outline" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <section aria-label="Overview" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <StatCard label="Total orders" value={totalFromStatusCounts(data.status_counts)} icon={ClipboardList} />
            <StatCard
              label="Today's orders"
              value={countOrdersOnIstDay(data.items)}
              icon={CalendarDays}
              hint="Placed today (India time)"
            />
          </section>

          <section aria-labelledby="by-status-heading" className="space-y-3">
            <h2 id="by-status-heading" className="text-h2 font-bold">
              By status
            </h2>
            {/* Mobile: one column (cards stack). Then 2, 3 and 5 columns as space allows. */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {ORDER_STATUSES.map((status) => (
                <StatCard
                  key={status}
                  label={STATUS_LABELS[status]}
                  value={data.status_counts[status]}
                  icon={STATUS_ICONS[status].icon}
                  iconClassName={STATUS_ICONS[status].className}
                />
              ))}
            </div>
          </section>

          <section aria-labelledby="recent-heading" className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 id="recent-heading" className="text-h2 font-bold">
                Recent orders
              </h2>
              <Link to="/admin/orders" className="font-semibold text-primary hover:underline">
                View all
              </Link>
            </div>
            {data.items.length === 0 ? (
              <p className="rounded-2xl bg-surface p-6 text-center text-muted-foreground shadow-card">No orders yet.</p>
            ) : (
              <ul className="divide-y overflow-hidden rounded-2xl bg-surface shadow-card">
                {/* items arrive newest first from the API */}
                {data.items.slice(0, RECENT_COUNT).map((order) => (
                  <li key={order.order_id}>
                    <Link
                      to="/admin/orders"
                      className="flex items-center gap-3 p-4 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold">#{order.order_id}</span>
                          <span className="truncate">{order.customer_name}</span>
                          <StatusBadge status={order.status} />
                        </div>
                        <p className="text-small text-muted-foreground">
                          {formatDateTime(order.order_date)} · {order.item_count}{" "}
                          {order.item_count === 1 ? "item" : "items"}
                        </p>
                      </div>
                      <span className="font-bold">{formatCurrency(order.total_amount)}</span>
                      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default DashboardPage
