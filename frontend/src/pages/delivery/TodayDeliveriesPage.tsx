/**
 * TodayDeliveriesPage (#109): the delivery boy's list for today, at /delivery.
 *
 * Only orders in his areas (the backend decides, by PIN code). Each card has what he needs
 * at the door: the address, a "Call" link, the items, the amount to collect, a "Navigate"
 * link that opens directions in the maps app (#134: the pin from #108, or the address
 * text when there is no pin), and ONE button for the next step
 * (Start delivery → Mark delivered). The list refreshes every minute.
 * #110: the RoundPanel on top starts / stops sharing his location.
 */
import { Loader2, Navigation, PackageCheck, Phone } from "lucide-react"
import { toast } from "sonner"

import { EmptyState } from "@/components/common/EmptyState"
import { RoundPanel } from "@/components/delivery/RoundPanel"
import { ErrorState } from "@/components/common/ErrorState"
import { StatusBadge } from "@/components/common/StatusBadge"
import { Button } from "@/components/ui/button"
import { useDeliveryMe, useMyDeliveries, useUpdateDeliveryStatus } from "@/hooks/useDelivery"
import { navigationLink, nextDeliveryAction, summarize, waitingNote } from "@/lib/delivery"
import { formatCurrency } from "@/lib/format"
import { ServiceError } from "@/services/serviceError"
import type { DeliveryOrder } from "@/types/delivery"

function TodayDeliveriesPage() {
  const me = useDeliveryMe()
  const orders = useMyDeliveries()

  const areas = me.data?.areas.map((a) => (a.area_name ? `${a.area_name} (${a.pincode})` : a.pincode)) ?? []
  const summary = orders.data ? summarize(orders.data) : null

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-h1 font-bold">Today's deliveries</h1>
        {summary && summary.total > 0 && (
          <p className="font-semibold" data-testid="delivery-summary">
            {summary.left} of {summary.total} left · {summary.delivered} delivered
          </p>
        )}
        {areas.length > 0 && <p className="text-small text-muted-foreground">Your areas: {areas.join(", ")}</p>}
      </header>

      {me.data && <RoundPanel onRound={me.data.on_round} />}

      {orders.isPending ? (
        <div className="space-y-3" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : orders.isError ? (
        <ErrorState
          title="Could not load your deliveries"
          error={orders.error}
          onRetry={() => orders.refetch()}
          retrying={orders.isFetching}
        />
      ) : orders.data.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title="Nothing to deliver today"
          description={
            areas.length === 0
              ? "You have no areas yet. Ask the dairy to give you your PIN codes."
              : "New orders in your areas appear here by themselves."
          }
        />
      ) : (
        <ul className="space-y-3" aria-label="Orders to deliver">
          {orders.data.map((order) => (
            <li key={order.order_id}>
              <DeliveryCard order={order} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function DeliveryCard({ order }: { order: DeliveryOrder }) {
  const update = useUpdateDeliveryStatus()
  const action = nextDeliveryAction(order.status)
  const note = waitingNote(order.status)
  const directions = navigationLink(order)

  function act() {
    if (!action) return
    update.mutate(
      { orderId: order.order_id, status: action.status },
      {
        onSuccess: (updated) =>
          toast.success(
            updated.status === "DELIVERED"
              ? `Order #${order.order_id} delivered`
              : `Order #${order.order_id} is on its way`,
          ),
        onError: (error) =>
          toast.error(error instanceof ServiceError ? error.message : "The order was not updated. Please try again."),
      },
    )
  }

  return (
    <article className="space-y-3 rounded-2xl bg-surface p-4 shadow-card" aria-labelledby={`order-${order.order_id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`order-${order.order_id}`} className="text-h3 font-semibold">
          #{order.order_id} · {order.customer_name}
        </h2>
        <StatusBadge status={order.status} />
      </div>

      {order.delivery_slot && <p className="text-small font-semibold text-primary">{order.delivery_slot}</p>}
      <p className="break-words">{order.delivery_address ?? "No address on this order"}</p>

      <ul className="text-small text-muted-foreground">
        {order.items.map((item) => (
          <li key={`${item.product_name}-${item.size}`}>
            {item.quantity} × {item.product_name} {item.size}
          </li>
        ))}
      </ul>
      <p className="font-semibold">Collect {formatCurrency(order.total_amount)}</p>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" className="h-11">
          <a href={`tel:+91${order.customer_phone}`}>
            <Phone aria-hidden="true" />
            Call<span className="sr-only"> {order.customer_name}</span>
          </a>
        </Button>
        {directions && (
          <Button asChild variant="outline" className="h-11">
            <a href={directions} target="_blank" rel="noreferrer">
              <Navigation aria-hidden="true" />
              Navigate<span className="sr-only"> to {order.customer_name} (opens Google Maps)</span>
            </a>
          </Button>
        )}
        {action && (
          <Button className="h-11 flex-1" onClick={act} disabled={update.isPending}>
            {update.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            {action.label}
          </Button>
        )}
      </div>
      {note && <p className="text-small text-muted-foreground">{note}</p>}
    </article>
  )
}

export default TodayDeliveriesPage
