/**
 * OrderItemsList – the items of a PLACED order plus its total (FR-A3, FR-C6).
 *
 * Unlike the cart, every number here comes from the order returned by the
 * service/backend (unit_price, subtotal, total_amount). We only format them;
 * we never recalculate them on the frontend.
 * Used on the confirmation page, the order details page and the admin sheet.
 */
import { formatCurrency } from '@/lib/format'
import type { Order } from '@/types/order'

export function OrderItemsList({ order }: { order: Order }) {
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-border">
        {order.items.map((item) => (
          // `key` lets React track each row between renders; use a stable id, never the array index.
          <li key={item.order_item_id} className="flex items-start justify-between gap-3 py-3 first:pt-0">
            <div className="min-w-0">
              <p className="font-semibold">
                {item.product_name} <span className="font-medium text-muted-foreground">· {item.size}</span>
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {item.quantity} × {formatCurrency(item.unit_price)}
              </p>
            </div>
            <span className="font-bold tabular-nums">{formatCurrency(item.subtotal)}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-baseline justify-between border-t pt-3">
        <span className="font-semibold">Total</span>
        <span className="text-lg font-extrabold tabular-nums">{formatCurrency(order.total_amount)}</span>
      </div>
    </div>
  )
}
