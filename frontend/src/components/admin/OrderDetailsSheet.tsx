/**
 * OrderDetailsSheet – side panel with one order's full details (#31, FR-A3).
 *
 * Opens over the orders table, so the admin keeps their place in the list.
 * It fetches the FULL order (with items) only when opened, using useOrder();
 * the table itself only has summary rows.
 * `orderId = null` means the sheet is closed.
 */
import { Phone, User } from 'lucide-react'
import { ErrorState } from '@/components/common/ErrorState'
import { StatusBadge } from '@/components/common/StatusBadge'
import { OrderItemsList } from '@/components/orders/OrderItemsList'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrder } from '@/hooks/useOrders'
import { formatDateTime, formatOrderId } from '@/lib/format'
import { StatusUpdateControl } from './StatusUpdateControl'

interface OrderDetailsSheetProps {
  orderId: number | null
  onClose: () => void
}

export function OrderDetailsSheet({ orderId, onClose }: OrderDetailsSheetProps) {
  const { data: order, isPending, isError, error, refetch } = useOrder(orderId ?? 0)

  return (
    <Sheet open={orderId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle className="text-xl font-bold">Order {orderId !== null && formatOrderId(orderId)}</SheetTitle>
          <SheetDescription>{order ? formatDateTime(order.order_date) : 'Order details'}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-4 pb-6">
          {isPending && (
            <div className="flex flex-col gap-3" aria-busy="true">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}

          {isError && <ErrorState error={error} onRetry={() => void refetch()} />}

          {order && (
            <>
              <section className="flex flex-col gap-2">
                <h3 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Customer</h3>
                <p className="flex items-center gap-2 font-semibold">
                  <User className="size-4 text-muted-foreground" aria-hidden="true" />
                  {order.customer.name}
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="size-4 text-muted-foreground" aria-hidden="true" />
                  <a href={`tel:${order.customer.phone}`} className="hover:text-primary">
                    {order.customer.phone}
                  </a>
                </p>
              </section>

              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Status</h3>
                  <StatusBadge status={order.status} />
                </div>
                {/* `key` resets the control's selection whenever the status changes. */}
                <StatusUpdateControl key={order.status} orderId={order.order_id} status={order.status} />
              </section>

              <section className="flex flex-col gap-3">
                <h3 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Items</h3>
                <OrderItemsList order={order} />
              </section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
