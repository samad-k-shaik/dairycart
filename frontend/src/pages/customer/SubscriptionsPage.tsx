/**
 * Route: `/subscriptions` (#97): "My subscriptions" with a Cancel button.
 * Login required (RequireAuth in the router). Data: GET /api/v1/subscriptions/mine.
 *
 * Cancelling stops all FUTURE deliveries. An order already created for today stays
 * (it shows in My orders, where an admin can still cancel it).
 */
import { useState } from "react"
import { Link } from "react-router"
import { CalendarDays, Loader2, Repeat } from "lucide-react"
import { toast } from "sonner"

import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useReturnFocus } from "@/hooks/useReturnFocus"
import { useCancelSubscription, useMySubscriptions } from "@/hooks/useSubscriptions"
import { formatCurrency } from "@/lib/format"
import { formatDay, planLabel, STATUS_LABELS } from "@/lib/subscription"
import { cn } from "@/lib/utils"
import { ServiceError } from "@/services/serviceError"
import type { Subscription, SubscriptionStatus } from "@/types/subscription"

const STATUS_STYLES: Record<SubscriptionStatus, string> = {
  ACTIVE: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-700",
  COMPLETED: "bg-muted text-muted-foreground",
}

function SubscriptionsPage() {
  const query = useMySubscriptions()
  const [toCancel, setToCancel] = useState<Subscription | null>(null)

  return (
    <div className="space-y-6">
      <div className="photo-panel space-y-1 px-4 py-3">
        <h1 className="text-h1 font-bold">My subscriptions</h1>
        <p className="text-muted-foreground">
          The same items delivered every day. Each day&apos;s delivery also shows in My orders.
        </p>
      </div>

      {query.isPending ? (
        <div className="space-y-3" aria-hidden="true">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-3 rounded-2xl bg-surface p-4 shadow-card">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState
          title="We could not load your subscriptions"
          error={query.error}
          onRetry={() => query.refetch()}
          retrying={query.isFetching}
        />
      ) : query.data.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No subscriptions yet"
          description="Add milk to your cart, then choose “Subscribe” at checkout to get it every day."
          action={
            <Button asChild>
              <Link to="/">Browse products</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-4" aria-label="My subscriptions">
          {query.data.map((subscription) => (
            <li key={subscription.subscription_id}>
              <SubscriptionCard subscription={subscription} onCancel={() => setToCancel(subscription)} />
            </li>
          ))}
        </ul>
      )}

      <CancelDialog subscription={toCancel} onClose={() => setToCancel(null)} />
    </div>
  )
}

function SubscriptionCard({ subscription, onCancel }: { subscription: Subscription; onCancel: () => void }) {
  const { status } = subscription
  return (
    <article
      className="space-y-4 rounded-2xl bg-surface p-4 shadow-card md:p-5"
      aria-labelledby={`subscription-${subscription.subscription_id}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 id={`subscription-${subscription.subscription_id}`} className="text-h2 font-bold">
            {planLabel(subscription.plan)} plan
          </h2>
          <p className="flex items-center gap-1.5 text-small text-muted-foreground">
            <CalendarDays className="size-4" aria-hidden="true" />
            {formatDay(subscription.start_date)} – {formatDay(subscription.end_date)} · {subscription.days} days
          </p>
        </div>
        <Badge className={cn("font-semibold", STATUS_STYLES[status])}>{STATUS_LABELS[status]}</Badge>
      </header>

      <ul className="divide-y rounded-xl border">
        {subscription.items.map((item) => (
          <li key={item.product_id} className="flex justify-between gap-3 px-3 py-2.5">
            <span>
              {item.quantity} × {item.product_name}{" "}
              <span className="text-muted-foreground">{item.size}</span>
            </span>
            <span className="font-semibold">{formatCurrency(item.subtotal)}</span>
          </li>
        ))}
      </ul>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Fact label="Each day" value={formatCurrency(subscription.daily_total)} />
        <Fact label="Plan total" value={formatCurrency(subscription.plan_total)} />
        <Fact label="Deliveries so far" value={`${subscription.orders_created} of ${subscription.days}`} />
      </dl>

      <p className="text-small text-muted-foreground">
        Deliver to {subscription.customer.name} · {subscription.customer.phone}
      </p>

      {status === "ACTIVE" && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <p className="text-small text-muted-foreground">Pay cash on each delivery.</p>
          <Button variant="outline" className="h-11 text-danger hover:text-danger" onClick={onCancel}>
            Cancel subscription
          </Button>
        </div>
      )}
    </article>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <dt className="text-small text-muted-foreground">{label}</dt>
      <dd className="text-h3 font-semibold">{value}</dd>
    </div>
  )
}

/** "Are you sure?" before cancelling. Closed when `subscription` is null. */
function CancelDialog({ subscription, onClose }: { subscription: Subscription | null; onClose: () => void }) {
  const returnFocus = useReturnFocus()
  const cancel = useCancelSubscription()

  function handleConfirm() {
    if (!subscription) return
    cancel.mutate(subscription.subscription_id, {
      onSuccess: () => {
        toast.success("Subscription cancelled", { description: "No more deliveries from tomorrow." })
        onClose()
      },
      onError: (error) => {
        toast.error("Subscription not cancelled", {
          description: error instanceof ServiceError ? error.message : "Please try again.",
        })
        onClose()
      },
    })
  }

  return (
    <AlertDialog open={subscription !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent {...returnFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this subscription?</AlertDialogTitle>
          <AlertDialogDescription>
            There will be no more deliveries after today. An order already created for today
            still arrives. You can subscribe again at any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11" disabled={cancel.isPending}>
            Keep subscription
          </AlertDialogCancel>
          <Button variant="destructive" className="h-11" onClick={handleConfirm} disabled={cancel.isPending}>
            {cancel.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            Yes, cancel it
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default SubscriptionsPage
