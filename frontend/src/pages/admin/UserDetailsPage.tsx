/**
 * Route: `/admin/users/:userId` (#101). One user: details, order totals, subscriptions and
 * ALL their orders (newest first). Clicking an order opens the same details panel as the
 * Orders page, where the admin can change its status.
 */
import { useState } from "react"
import { Link, useParams } from "react-router"
import { ArrowLeft, ClipboardList, Repeat } from "lucide-react"

import { OrderDetailsSheet } from "@/components/admin/OrderDetailsSheet"
import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { StatusBadge } from "@/components/common/StatusBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminUser, useAdminUserOrders } from "@/hooks/useAdminViews"
import { useAdminUserSubscriptions } from "@/hooks/useSubscriptions"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format"
import { formatDay, frequencyLabel, planLabel, STATUS_LABELS } from "@/lib/subscription"
import { cn } from "@/lib/utils"
import { ServiceError } from "@/services/serviceError"
import type { SubscriptionStatus } from "@/types/subscription"

const SUBSCRIPTION_STYLES: Record<SubscriptionStatus, string> = {
  ACTIVE: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-700",
  COMPLETED: "bg-muted text-muted-foreground",
}

function UserDetailsPage() {
  const userId = Number(useParams().userId)
  const valid = Number.isInteger(userId) && userId > 0
  if (!valid) return <UserNotFound />
  return <UserDetails userId={userId} />
}

function UserDetails({ userId }: { userId: number }) {
  const user = useAdminUser(userId)
  const orders = useAdminUserOrders(userId)
  const subscriptions = useAdminUserSubscriptions(userId)
  const [openOrder, setOpenOrder] = useState<{ id: number; opener: HTMLElement | null } | null>(null)

  if (user.isError && user.error instanceof ServiceError && user.error.status === 404) return <UserNotFound />

  return (
    <div className="space-y-5">
      <Link to="/admin/users" className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" />
        All users
      </Link>

      {user.isPending ? (
        <div className="space-y-3 rounded-2xl bg-surface p-4 shadow-card" aria-hidden="true">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-16" />
        </div>
      ) : user.isError ? (
        <ErrorState title="We could not load this user" error={user.error} onRetry={() => user.refetch()} retrying={user.isFetching} />
      ) : (
        <section className="space-y-4 rounded-2xl bg-surface p-4 shadow-card md:p-5" aria-labelledby="user-heading">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <h1 id="user-heading" className="text-h1 font-bold">
                {user.data.full_name}
              </h1>
              <p className="text-small break-all text-muted-foreground">
                {user.data.phone} · joined {formatDate(user.data.created_at)}
              </p>
            </div>
            {user.data.role === "ADMIN" ? (
              <Badge className="bg-primary-soft font-semibold text-primary">Admin</Badge>
            ) : (
              <Badge className="bg-muted font-semibold text-muted-foreground">User</Badge>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Fact label="Orders" value={String(user.data.order_count)} testId="order-count" />
            <Fact label="Total spent" value={formatCurrency(user.data.total_spent)} testId="total-spent" />
            <Fact
              label="Active plan"
              value={
                subscriptions.data ? (subscriptions.data.some((s) => s.status === "ACTIVE") ? "Yes" : "No") : "…"
              }
            />
          </dl>
          <p className="text-small text-muted-foreground">Total spent leaves out cancelled orders.</p>
        </section>
      )}

      {/* Subscriptions */}
      <section className="space-y-3" aria-labelledby="subs-heading">
        <h2 id="subs-heading" className="text-h2 font-bold">
          Subscriptions
        </h2>
        {subscriptions.isPending ? (
          <Skeleton className="h-16 rounded-2xl" />
        ) : subscriptions.isError ? (
          <ErrorState
            title="We could not load the subscriptions"
            error={subscriptions.error}
            onRetry={() => subscriptions.refetch()}
            retrying={subscriptions.isFetching}
          />
        ) : subscriptions.data.length === 0 ? (
          <p className="rounded-2xl bg-surface p-4 text-muted-foreground shadow-card">No subscriptions.</p>
        ) : (
          <ul className="space-y-2">
            {subscriptions.data.map((s) => (
              <li key={s.subscription_id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface p-4 shadow-card">
                <div>
                  <p className="flex items-center gap-1.5 font-semibold">
                    <Repeat className="size-4 text-primary" aria-hidden="true" />
                    {planLabel(s.plan)} · {frequencyLabel(s.every_n_days).toLowerCase()}
                  </p>
                  <p className="text-small text-muted-foreground">
                    {formatDay(s.start_date)} – {formatDay(s.end_date)} · {s.delivery_slot ?? "No time chosen"} ·{" "}
                    {s.orders_created} orders
                  </p>
                </div>
                <Badge className={cn("font-semibold", SUBSCRIPTION_STYLES[s.status])}>{STATUS_LABELS[s.status]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Orders */}
      <section className="space-y-3" aria-labelledby="orders-heading">
        <h2 id="orders-heading" className="text-h2 font-bold">
          Orders
        </h2>
        {orders.isPending ? (
          <Skeleton className="h-40 rounded-2xl" />
        ) : orders.isError ? (
          <ErrorState
            title="We could not load the orders"
            error={orders.error}
            onRetry={() => orders.refetch()}
            retrying={orders.isFetching}
          />
        ) : orders.data.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No orders yet" description="This user has not placed an order." />
        ) : (
          <div className="rounded-2xl bg-surface p-2 shadow-card">
            <Table aria-label="Orders of this user">
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead className="hidden sm:table-cell">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.data.map((order) => (
                  <TableRow key={order.order_id}>
                    <TableCell>
                      <p className="font-bold">#{order.order_id}</p>
                      <p className="text-small text-muted-foreground">{formatDateTime(order.order_date)}</p>
                      {order.subscription_id && (
                        <p className="flex items-center gap-1 text-small font-semibold text-primary">
                          <Repeat className="size-3.5" aria-hidden="true" />
                          Subscription
                        </p>
                      )}
                      {order.delivery_slot && <p className="text-small text-muted-foreground">{order.delivery_slot}</p>}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{order.item_count}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(order.total_amount)}</TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => setOpenOrder({ id: order.order_id, opener: e.currentTarget })}
                      >
                        View<span className="sr-only"> order {order.order_id}</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <OrderDetailsSheet
        orderId={openOrder?.id ?? null}
        onClose={() => setOpenOrder(null)}
        returnFocusTo={openOrder?.opener ?? null}
      />
    </div>
  )
}

function Fact({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <dt className="text-small text-muted-foreground">{label}</dt>
      <dd className="text-h3 font-semibold" data-testid={testId}>
        {value}
      </dd>
    </div>
  )
}

function UserNotFound() {
  return (
    <EmptyState
      icon={ClipboardList}
      headingLevel="h1"
      title="User not found"
      description="This user does not exist."
      action={
        <Button asChild>
          <Link to="/admin/users">All users</Link>
        </Button>
      }
    />
  )
}

export default UserDetailsPage
