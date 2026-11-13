/**
 * Route: `/admin/subscriptions` (#97). Every subscription, with a status filter.
 *
 * #99: the "Create today's subscription orders" button was removed. The backend creates
 * the delivery orders by itself (at startup, then every 15 minutes, ADR-015); they show
 * on the Orders page with a "Subscription" mark.
 */
import { useState } from "react"
import { Link } from "react-router"
import { Clock, Repeat } from "lucide-react"

import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminSubscriptions } from "@/hooks/useSubscriptions"
import { formatCurrency } from "@/lib/format"
import { formatDay, frequencyLabel, planLabel, STATUS_LABELS } from "@/lib/subscription"
import { cn } from "@/lib/utils"
import { SUBSCRIPTION_STATUSES, type SubscriptionStatus } from "@/types/subscription"

const STATUS_STYLES: Record<SubscriptionStatus, string> = {
  ACTIVE: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-700",
  COMPLETED: "bg-muted text-muted-foreground",
}

function SubscriptionsPage() {
  const [status, setStatus] = useState<SubscriptionStatus | undefined>(undefined)
  const query = useAdminSubscriptions(status)
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-h1 font-bold">Subscriptions</h1>
        <p className="text-muted-foreground">
          Plans for 1 week, 15 days or 1 month, delivered every day, every 2 days or every 3 days. Delivery
          orders are created automatically and appear on the Orders page.
        </p>
        {/* Phones: Delivery slots is not in the tab bar (#101), so link it here. */}
        <Link
          to="/admin/delivery-slots"
          className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary hover:underline md:hidden"
        >
          <Clock className="size-4" aria-hidden="true" />
          Manage delivery slots
        </Link>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {[undefined, ...SUBSCRIPTION_STATUSES].map((s) => (
          <button
            key={s ?? "all"}
            type="button"
            aria-pressed={status === s}
            onClick={() => setStatus(s)}
            className={cn(
              "h-11 rounded-full border px-4 font-semibold transition-colors",
              status === s ? "border-primary bg-primary text-primary-foreground" : "bg-surface hover:bg-muted",
            )}
          >
            {s ? STATUS_LABELS[s] : "All"}
          </button>
        ))}
      </div>

      {query.isPending ? (
        <div className="space-y-2 rounded-2xl bg-surface p-4 shadow-card" aria-hidden="true">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-8" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState
          title="We could not load the subscriptions"
          error={query.error}
          onRetry={() => query.refetch()}
          retrying={query.isFetching}
        />
      ) : query.data.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title={status ? `No ${STATUS_LABELS[status].toLowerCase()} subscriptions` : "No subscriptions yet"}
          description="Customers subscribe at checkout by choosing “Subscribe”."
        />
      ) : (
        <div className="rounded-2xl bg-surface p-2 shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden sm:table-cell">ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="hidden md:table-cell">Dates</TableHead>
                <TableHead className="hidden sm:table-cell">Each delivery</TableHead>
                <TableHead className="hidden md:table-cell">Orders</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.map((row) => (
                <TableRow key={row.subscription_id}>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{row.subscription_id}</TableCell>
                  <TableCell>
                    <p className="font-semibold">{row.customer_name}</p>
                    <p className="text-small text-muted-foreground">
                      {row.customer_phone} · @{row.username}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p>{planLabel(row.plan)}</p>
                    <p className="text-small text-muted-foreground">{frequencyLabel(row.every_n_days)}</p>
                    {/* #100 */}
                    <p className="text-small text-muted-foreground">{row.delivery_slot ?? "No time chosen"}</p>
                    {/* Phones: the dates move under the plan. */}
                    <p className="text-small text-muted-foreground md:hidden">from {formatDay(row.start_date)}</p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatDay(row.start_date)} – {formatDay(row.end_date)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{formatCurrency(row.daily_total)}</TableCell>
                  <TableCell className="hidden md:table-cell">{row.orders_created}</TableCell>
                  <TableCell>
                    <Badge className={cn("font-semibold", STATUS_STYLES[row.status])}>{STATUS_LABELS[row.status]}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

export default SubscriptionsPage
