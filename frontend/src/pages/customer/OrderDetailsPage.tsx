/**
 * OrderDetailsPage – route "/orders/:id" (#29, FR-C7 "selecting one shows its details").
 *
 * Shows the status TIMELINE (Placed → Confirmed → Out for delivery → Delivered,
 * or Cancelled), the items with backend prices, and the customer's details.
 * Uses GET /orders/{id}, the same endpoint as the confirmation page.
 */
import { ArrowLeft, PackageX } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { StatusBadge } from '@/components/common/StatusBadge'
import { OrderItemsList } from '@/components/orders/OrderItemsList'
import { OrderStatusTimeline } from '@/components/orders/OrderStatusTimeline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrder } from '@/hooks/useOrders'
import { formatDateTime, formatOrderId } from '@/lib/format'
import { isApiRequestError } from '@/services/apiError'

export function OrderDetailsPage() {
  const { id } = useParams()
  const orderId = Number(id)
  const { data: order, isPending, isError, error, refetch } = useOrder(orderId)

  const isValidId = Number.isInteger(orderId) && orderId > 0
  if (!isValidId || (isError && isApiRequestError(error) && error.code === 'NOT_FOUND')) {
    return (
      <EmptyState
        icon={PackageX}
        title="Order not found"
        description="We could not find this order."
        action={
          <Button asChild>
            <Link to="/orders">Back to my orders</Link>
          </Button>
        }
      />
    )
  }
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />
  if (isPending) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <Link
        to={`/orders?phone=${order.customer.phone}`}
        className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All my orders
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl/8 font-bold tracking-tight">Order {formatOrderId(order.order_id)}</h1>
          <p className="text-muted-foreground">Placed on {formatDateTime(order.order_date)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <Card className="gap-4 px-5 py-5">
        <h2 className="text-xl/7 font-bold">Delivery status</h2>
        <OrderStatusTimeline status={order.status} />
      </Card>

      <Card className="gap-4 px-5 py-5">
        <h2 className="text-xl/7 font-bold">Items</h2>
        <OrderItemsList order={order} />
      </Card>

      <Card className="gap-1 px-5 py-5">
        <h2 className="mb-2 text-xl/7 font-bold">Customer</h2>
        <p className="font-semibold">{order.customer.name}</p>
        <p className="text-muted-foreground">{order.customer.phone}</p>
        <p className="mt-2 text-xs text-muted-foreground">Payment: cash on delivery</p>
      </Card>
    </div>
  )
}
