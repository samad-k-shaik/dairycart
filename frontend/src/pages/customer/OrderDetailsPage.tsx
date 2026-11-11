/**
 * Route: `/orders/:id` (FR-C7 "selecting one shows its details").
 * Order header, status timeline and items with the backend-calculated total.
 */
import { Link, useParams } from "react-router"
import { ArrowLeft } from "lucide-react"

import { StatusBadge } from "@/components/common/StatusBadge"
import { OrderItemsList } from "@/components/orders/OrderItemsList"
import { OrderLoadProblem } from "@/components/orders/OrderLoadProblem"
import { OrderStatusTimeline } from "@/components/orders/OrderStatusTimeline"
import { Skeleton } from "@/components/ui/skeleton"
import { useOrder } from "@/hooks/useOrder"
import { formatDateTime } from "@/lib/format"

function OrderDetailsPage() {
  const { id } = useParams()
  const { data: order, isPending, isError, error, refetch, isFetching } = useOrder(Number(id))

  const backTo = "/orders" // My orders (#90)

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        to={backTo}
        className="photo-panel inline-flex items-center gap-1.5 px-3 py-2 font-semibold text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to my orders
      </Link>

      {isPending ? (
        <div className="space-y-4" aria-hidden="true">
          <Skeleton className="h-9 w-48" />
          <div className="grid gap-4 md:grid-cols-[240px_1fr]">
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
          </div>
        </div>
      ) : isError ? (
        <OrderLoadProblem error={error} onRetry={() => refetch()} retrying={isFetching} />
      ) : (
        <>
          <header className="photo-panel flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <h1 className="text-h1 font-bold">Order #{order.order_id}</h1>
              <p className="text-muted-foreground">{formatDateTime(order.order_date)}</p>
            </div>
            {/* text-sm (not our text-body token): cn() would treat "text-body" as a colour
                and drop the status colour. */}
            <StatusBadge status={order.status} className="px-3 py-1 text-sm" />
          </header>

          <div className="grid gap-4 md:grid-cols-[240px_1fr]">
            <section aria-labelledby="timeline-heading" className="space-y-4 rounded-2xl bg-surface p-4 shadow-card md:p-5">
              <h2 id="timeline-heading" className="text-h3 font-bold">
                Status
              </h2>
              <OrderStatusTimeline status={order.status} />
            </section>

            <section aria-labelledby="items-heading" className="space-y-2 rounded-2xl bg-surface p-4 shadow-card md:p-5">
              <h2 id="items-heading" className="text-h3 font-bold">
                Items
              </h2>
              <OrderItemsList order={order} />
              <p className="pt-2 text-small text-muted-foreground">
                Ordered by {order.customer.name} · {order.customer.phone} · Cash on delivery
              </p>
            </section>
          </div>
        </>
      )}
    </div>
  )
}

export default OrderDetailsPage
