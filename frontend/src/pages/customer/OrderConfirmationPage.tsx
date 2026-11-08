/**
 * Route: `/orders/:id/confirmation` (FR-C6, FR-C8).
 * Shows the order RETURNED BY THE SERVICE: its id, items and backend-calculated total,
 * never the cart estimate. If the two differ, a notice explains it (FR-C8).
 */
import { Link, useLocation, useParams } from "react-router"
import { CheckCircle2, Info, PackageSearch } from "lucide-react"

import { StatusBadge } from "@/components/common/StatusBadge"
import { OrderItemsList } from "@/components/orders/OrderItemsList"
import { Button } from "@/components/ui/button"
import { useOrder } from "@/hooks/useOrder"
import { formatCurrency, formatDateTime } from "@/lib/format"
import type { ConfirmationState } from "@/pages/customer/CheckoutPage"
import { ServiceError } from "@/services/serviceError"

function OrderConfirmationPage() {
  const { id } = useParams()
  const { data: order, isPending, isError, error, refetch } = useOrder(Number(id))
  // Set by the checkout page right after placing the order (missing if the page is reloaded).
  const estimatedTotal = (useLocation().state as ConfirmationState | null)?.estimatedTotal

  if (isPending) {
    return (
      <div className="mx-auto max-w-2xl animate-pulse space-y-4 rounded-2xl bg-surface p-6 shadow-card" aria-hidden="true">
        <div className="mx-auto size-16 rounded-full bg-muted" />
        <div className="mx-auto h-8 w-1/2 rounded bg-muted" />
        <div className="h-32 rounded bg-muted" />
      </div>
    )
  }

  if (isError) {
    const notFound = error instanceof ServiceError && error.status === 404
    return (
      <section className="mx-auto flex max-w-2xl flex-col items-center gap-4 rounded-2xl bg-surface py-12 text-center shadow-card">
        <PackageSearch className="size-12 text-muted-foreground" aria-hidden="true" />
        <h1 className="text-h1 font-bold">{notFound ? "Order not found" : "Could not load the order"}</h1>
        {notFound ? (
          <Button asChild>
            <Link to="/orders">Find my orders</Link>
          </Button>
        ) : (
          <Button variant="outline" onClick={() => refetch()}>
            Try again
          </Button>
        )}
      </section>
    )
  }

  const priceChanged = estimatedTotal !== undefined && estimatedTotal !== order.total_amount

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="space-y-3 rounded-2xl bg-surface p-6 text-center shadow-card">
        <CheckCircle2 className="mx-auto size-16 text-success" aria-hidden="true" />
        <h1 className="text-h1 font-bold">Order placed!</h1>
        <p className="text-muted-foreground">
          Thank you, {order.customer.name}. Your order number is{" "}
          <span className="font-bold text-foreground">#{order.order_id}</span>.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 text-small text-muted-foreground">
          <StatusBadge status={order.status} />
          <span>{formatDateTime(order.order_date)}</span>
        </div>
      </section>

      <section aria-labelledby="confirmation-items-heading" className="space-y-3 rounded-2xl bg-surface p-4 shadow-card md:p-5">
        <h2 id="confirmation-items-heading" className="text-h2 font-bold">
          Your items
        </h2>
        <OrderItemsList order={order} />
        {priceChanged && (
          <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-small text-amber-700" role="status">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Prices changed since you added these items. Your cart estimate was{" "}
            {formatCurrency(estimatedTotal)}; the total above is the confirmed amount.
          </p>
        )}
        <p className="rounded-xl bg-primary-soft p-3 text-small text-primary">
          Pay {formatCurrency(order.total_amount)} in cash on delivery.
        </p>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg" className="h-12 flex-1">
          <Link to={`/orders?phone=${order.customer.phone}`}>View my orders</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-12 flex-1">
          <Link to="/">Continue shopping</Link>
        </Button>
      </div>
    </div>
  )
}

export default OrderConfirmationPage
