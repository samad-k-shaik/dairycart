/**
 * OrderDetailsSheet: side panel with one order's customer, items, totals and the
 * status update control. Opened from the admin orders table/cards.
 */
import { ErrorState } from "@/components/common/ErrorState"
import { StatusBadge } from "@/components/common/StatusBadge"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusUpdateControl } from "@/components/admin/StatusUpdateControl"
import { OrderItemsList } from "@/components/orders/OrderItemsList"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useOrder } from "@/hooks/useOrder"
import { formatDateTime } from "@/lib/format"

type OrderDetailsSheetProps = {
  orderId: number | null
  onClose: () => void
}

export function OrderDetailsSheet({ orderId, onClose }: OrderDetailsSheetProps) {
  return (
    <Sheet open={orderId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {orderId !== null && <SheetBody orderId={orderId} />}
      </SheetContent>
    </Sheet>
  )
}

function SheetBody({ orderId }: { orderId: number }) {
  const { data: order, isPending, isError, error, refetch, isFetching } = useOrder(orderId)

  return (
    <>
      <SheetHeader>
        <SheetTitle className="text-h2 font-bold">Order #{orderId}</SheetTitle>
        <SheetDescription>{order ? formatDateTime(order.order_date) : "Order details"}</SheetDescription>
      </SheetHeader>

      <div className="space-y-5 px-4 pb-6">
        {isPending ? (
          <div className="space-y-3" aria-hidden="true">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-11" />
            <Skeleton className="h-32" />
          </div>
        ) : isError ? (
          <ErrorState
            title="We could not load this order"
            error={error}
            onRetry={() => refetch()}
            retrying={isFetching}
            className="shadow-none"
          />
        ) : (
          <>
            <div className="space-y-1">
              <StatusBadge status={order.status} />
              <p className="font-semibold">{order.customer.name}</p>
              <p className="text-small text-muted-foreground">{order.customer.phone} · Cash on delivery</p>
            </div>
            <StatusUpdateControl key={order.status} orderId={order.order_id} status={order.status} />
            <div className="space-y-2">
              <h3 className="text-h3 font-semibold">Items</h3>
              <OrderItemsList order={order} />
            </div>
          </>
        )}
      </div>
    </>
  )
}
