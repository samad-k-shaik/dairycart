/**
 * Route: `/admin/subscriptions` (#97). Every subscription, a status filter, and the
 * daily button "Create today's subscription orders".
 *
 * There is no scheduler in this project (ADR-015): each morning an admin presses the
 * button (or runs `python -m app.scripts.generate_subscription_orders`). It creates one
 * normal order per ACTIVE subscription for today. Pressing it twice is safe.
 */
import { useState } from "react"
import { Link } from "react-router"
import { CalendarPlus, Loader2, Repeat } from "lucide-react"
import { toast } from "sonner"

import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminSubscriptions, useGenerateSubscriptionOrders } from "@/hooks/useSubscriptions"
import { formatCurrency } from "@/lib/format"
import { formatDay, planLabel, STATUS_LABELS } from "@/lib/subscription"
import { cn } from "@/lib/utils"
import { ServiceError } from "@/services/serviceError"
import {
  SUBSCRIPTION_STATUSES,
  type GenerateOrdersResult,
  type SubscriptionStatus,
} from "@/types/subscription"

const STATUS_STYLES: Record<SubscriptionStatus, string> = {
  ACTIVE: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-700",
  COMPLETED: "bg-muted text-muted-foreground",
}

function SubscriptionsPage() {
  const [status, setStatus] = useState<SubscriptionStatus | undefined>(undefined)
  const query = useAdminSubscriptions(status)
  const generate = useGenerateSubscriptionOrders()
  const [result, setResult] = useState<GenerateOrdersResult | null>(null)

  function handleGenerate() {
    generate.mutate(undefined, {
      onSuccess: (answer) => {
        setResult(answer)
        toast.success(`${answer.created.length} subscription ${answer.created.length === 1 ? "order" : "orders"} created`)
      },
      onError: (error) =>
        toast.error("Orders not created", {
          description: error instanceof ServiceError ? error.message : "Please try again.",
        }),
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-h1 font-bold">Subscriptions</h1>
          <p className="text-muted-foreground">Daily plans for 1 week, 15 days or 1 month.</p>
        </div>
        <Button className="h-11" onClick={handleGenerate} disabled={generate.isPending}>
          {generate.isPending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <CalendarPlus aria-hidden="true" />
          )}
          Create today&apos;s subscription orders
        </Button>
      </div>

      {result && <GenerateSummary result={result} />}

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
                <TableHead className="hidden sm:table-cell">Each day</TableHead>
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

/** What the last button press did, so the admin can act on skipped plans. */
function GenerateSummary({ result }: { result: GenerateOrdersResult }) {
  return (
    <section
      aria-label="Result"
      role="status"
      className="space-y-2 rounded-2xl bg-primary-soft p-4 text-small"
    >
      <p className="font-semibold">
        Orders for {formatDay(result.delivery_date)}: {result.created.length} created, {result.already_created} already
        created, {result.skipped.length} skipped
        {result.completed > 0 && `, ${result.completed} plan${result.completed === 1 ? "" : "s"} completed`}.
      </p>
      {result.created.length > 0 && (
        <p>
          New orders:{" "}
          {result.created.map((c, i) => (
            <span key={c.order_id}>
              {i > 0 && ", "}
              <Link className="font-semibold text-primary hover:underline" to={`/admin/orders?order=${c.order_id}`}>
                #{c.order_id}
              </Link>
            </span>
          ))}
        </p>
      )}
      {result.skipped.length > 0 && (
        <ul className="list-disc pl-5 text-danger">
          {result.skipped.map((s) => (
            <li key={s.subscription_id}>
              Subscription #{s.subscription_id}: {s.reason}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default SubscriptionsPage
