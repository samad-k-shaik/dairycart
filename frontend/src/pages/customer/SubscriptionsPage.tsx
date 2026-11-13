/**
 * Route: `/subscriptions` (#97): "My subscriptions" with a Cancel button.
 * Login required (RequireAuth in the router). Data: GET /api/v1/subscriptions/mine.
 *
 * Cancelling stops all FUTURE deliveries. An order already created for today stays
 * (it shows in My orders, where an admin can still cancel it).
 *
 * #100: each card shows the booked delivery time, and "Change time" moves an active plan
 * to another slot that has places left (orders already created keep their time).
 */
import { useState } from "react"
import { Link } from "react-router"
import { CalendarDays, Clock, Loader2, Repeat } from "lucide-react"
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
import { useDeliverySlots } from "@/hooks/useDeliverySlots"
import { useReturnFocus } from "@/hooks/useReturnFocus"
import { useCancelSubscription, useChangeDeliverySlot, useMySubscriptions } from "@/hooks/useSubscriptions"
import { slotTimeRange, spacesLeftText } from "@/lib/deliverySlot"
import { formatCurrency } from "@/lib/format"
import { formatDay, frequencyLabel, planLabel, STATUS_LABELS } from "@/lib/subscription"
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
  const [toChange, setToChange] = useState<Subscription | null>(null)

  return (
    <div className="space-y-6">
      <div className="photo-panel space-y-1 px-4 py-3">
        <h1 className="text-h1 font-bold">My subscriptions</h1>
        <p className="text-muted-foreground">
          The same items on a regular schedule. Each delivery also shows in My orders.
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
              <SubscriptionCard
                subscription={subscription}
                onCancel={() => setToCancel(subscription)}
                onChangeTime={() => setToChange(subscription)}
              />
            </li>
          ))}
        </ul>
      )}

      <CancelDialog subscription={toCancel} onClose={() => setToCancel(null)} />
      <ChangeTimeDialog subscription={toChange} onClose={() => setToChange(null)} />
    </div>
  )
}

function SubscriptionCard({
  subscription,
  onCancel,
  onChangeTime,
}: {
  subscription: Subscription
  onCancel: () => void
  onChangeTime: () => void
}) {
  const { status, delivery_slot: slot } = subscription
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
            {formatDay(subscription.start_date)} – {formatDay(subscription.end_date)} ·{" "}
            {frequencyLabel(subscription.every_n_days).toLowerCase()}
          </p>
          {/* #100: the booked delivery time */}
          <p className="flex items-center gap-1.5 text-small text-muted-foreground" data-testid="delivery-time">
            <Clock className="size-4" aria-hidden="true" />
            {slot ? `${slot.name}, ${slotTimeRange(slot)}` : "No delivery time chosen"}
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
        <Fact label="Each delivery" value={formatCurrency(subscription.daily_total)} />
        <Fact label="Plan total" value={formatCurrency(subscription.plan_total)} />
        <Fact label="Deliveries so far" value={`${subscription.orders_created} of ${subscription.deliveries}`} />
      </dl>

      <p className="text-small text-muted-foreground">
        Deliver to {subscription.customer.name} · {subscription.customer.phone}
      </p>

      {status === "ACTIVE" && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <p className="text-small text-muted-foreground">Pay cash on each delivery.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="h-11" onClick={onChangeTime}>
              <Clock aria-hidden="true" />
              {slot ? "Change time" : "Choose time"}
            </Button>
            <Button variant="outline" className="h-11 text-danger hover:text-danger" onClick={onCancel}>
              Cancel subscription
            </Button>
          </div>
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
        toast.success("Subscription cancelled", { description: "No more deliveries after today." })
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

/** #100: pick another delivery time. Closed when `subscription` is null. */
function ChangeTimeDialog({ subscription, onClose }: { subscription: Subscription | null; onClose: () => void }) {
  const returnFocus = useReturnFocus()
  const open = subscription !== null
  const slots = useDeliverySlots({ enabled: open })
  const change = useChangeDeliverySlot()
  const currentId = subscription?.delivery_slot?.delivery_slot_id ?? null
  const [picked, setPicked] = useState<number | null>(null)
  const chosen = picked ?? currentId

  function close() {
    setPicked(null)
    change.reset()
    onClose()
  }

  function handleSave() {
    if (!subscription || chosen === null) return
    if (chosen === currentId) return close()
    change.mutate(
      { subscriptionId: subscription.subscription_id, deliverySlotId: chosen },
      {
        onSuccess: (updated) => {
          toast.success("Delivery time changed", {
            description: `${updated.delivery_slot?.label ?? ""}. Deliveries already created keep their time.`,
          })
          close()
        },
        // e.g. the slot filled up meanwhile: show the reason and the fresh places left.
        onError: () => void slots.refetch(),
      },
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && close()}>
      <AlertDialogContent {...returnFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>Change delivery time</AlertDialogTitle>
          <AlertDialogDescription>
            The new time applies to the next deliveries. Deliveries already created keep their time.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {slots.isPending ? (
          <p className="flex items-center gap-2 text-small text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Loading delivery times…
          </p>
        ) : slots.isError ? (
          <p className="text-small text-danger">We could not load the delivery times. Please try again.</p>
        ) : (
          <div className="grid gap-2" role="radiogroup" aria-label="Delivery time">
            {slots.data.map((slot) => {
              const isCurrent = slot.delivery_slot_id === currentId
              // Your own slot is never "full" for you: you already have a place in it.
              const unavailable = slot.is_full && !isCurrent
              const checked = chosen === slot.delivery_slot_id
              return (
                <button
                  key={slot.delivery_slot_id}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  disabled={unavailable}
                  onClick={() => {
                    setPicked(slot.delivery_slot_id)
                    change.reset()
                  }}
                  className={cn(
                    "flex min-h-11 items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors",
                    checked ? "border-primary bg-primary-soft" : "hover:bg-muted",
                    unavailable && "cursor-not-allowed opacity-60 hover:bg-transparent",
                  )}
                >
                  <span>
                    <span className="block font-semibold">{slot.name}</span>
                    <span className="block text-small">{slotTimeRange(slot)}</span>
                  </span>
                  <span
                    className={cn("text-small", unavailable ? "font-semibold text-danger" : "text-muted-foreground")}
                  >
                    {isCurrent ? "Current" : spacesLeftText(slot)}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {change.isError && (
          <p role="alert" className="text-small text-danger">
            {change.error instanceof ServiceError ? change.error.message : "Please try again."}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel className="h-11" disabled={change.isPending}>
            Keep current time
          </AlertDialogCancel>
          <Button className="h-11" onClick={handleSave} disabled={change.isPending || chosen === null}>
            {change.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            Save time
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default SubscriptionsPage
