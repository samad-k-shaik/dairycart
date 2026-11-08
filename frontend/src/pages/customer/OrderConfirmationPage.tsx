/**
 * OrderConfirmationPage – route "/orders/:id/confirmation" (#28, FR-C6, FR-C8).
 *
 * Shows the order RETURNED BY THE SERVICE/BACKEND: order id, items, total and
 * status (PLACED). The total shown is the backend's total, never the cart estimate.
 *
 * FR-C8 (price changed notice): the checkout page passes the cart ESTIMATE in
 * the navigation `state`. If the backend total differs (e.g. a price changed
 * meanwhile), we say so clearly.
 *
 * The order is usually already in the TanStack Query cache (useCreateOrder put
 * it there), so this page appears instantly; after a refresh it is fetched again.
 */
import { CheckCircle2, ClipboardList, Info, PackageX } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { StatusBadge } from '@/components/common/StatusBadge'
import { OrderItemsList } from '@/components/orders/OrderItemsList'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrder } from '@/hooks/useOrders'
import { formatCurrency, formatDateTime, formatOrderId } from '@/lib/format'
import { isApiRequestError } from '@/services/apiError'
import type { ConfirmationState } from './CheckoutPage'

export function OrderConfirmationPage() {
  const { id } = useParams()
  const orderId = Number(id)
  const { data: order, isPending, isError, error, refetch } = useOrder(orderId)
  // `state` exists only when we arrived from checkout (not after a refresh or a shared link).
  const location = useLocation()
  const estimatedTotal = (location.state as ConfirmationState | null)?.estimatedTotal

  const isValidId = Number.isInteger(orderId) && orderId > 0
  if (!isValidId || (isError && isApiRequestError(error) && error.code === 'NOT_FOUND')) {
    return (
      <EmptyState
        icon={PackageX}
        title="Order not found"
        description="We could not find this order."
        action={
          <Button asChild>
            <Link to="/orders">Find my orders</Link>
          </Button>
        }
      />
    )
  }
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />
  if (isPending) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4" aria-busy="true">
        <Skeleton className="size-16 rounded-full" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    )
  }

  const priceChanged = estimatedTotal !== undefined && estimatedTotal !== order.total_amount

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-green-50 text-success">
          <CheckCircle2 className="size-9" aria-hidden="true" />
        </div>
        <h1 className="text-2xl/8 font-bold tracking-tight">Thank you, your order is placed!</h1>
        <p className="text-muted-foreground">
          Order <span className="font-bold text-foreground">{formatOrderId(order.order_id)}</span> ·{' '}
          {formatDateTime(order.order_date)}
        </p>
        <StatusBadge status={order.status} />
      </div>

      {priceChanged && (
        <div role="status" className="flex gap-3 rounded-xl bg-amber-50 px-4 py-3 text-amber-800">
          <Info className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>
            Prices changed since you added items to your cart. Your cart estimate was{' '}
            <strong>{formatCurrency(estimatedTotal)}</strong>; the confirmed total is{' '}
            <strong>{formatCurrency(order.total_amount)}</strong>.
          </p>
        </div>
      )}

      <Card className="gap-4 px-5 py-5">
        <h2 className="text-xl/7 font-bold">Order details</h2>
        <OrderItemsList order={order} />
        <p className="rounded-xl bg-primary-soft px-3 py-2 text-xs text-primary">
          Pay {formatCurrency(order.total_amount)} in cash when your milk is delivered.
        </p>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild variant="outline" size="lg" className="flex-1">
          {/* Pre-fills the history lookup with the phone used for this order. */}
          <Link to={`/orders?phone=${order.customer.phone}`}>
            <ClipboardList aria-hidden="true" />
            View my orders
          </Link>
        </Button>
        <Button asChild size="lg" className="flex-1">
          <Link to="/">Continue shopping</Link>
        </Button>
      </div>
    </div>
  )
}
