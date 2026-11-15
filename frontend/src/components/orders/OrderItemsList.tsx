/**
 * OrderItemsList: the items of a placed order with quantity, unit price and subtotal,
 * and the total. All money comes from the order returned by the service (backend-calculated).
 */
import { formatCurrency } from "@/lib/format"
import type { Order } from "@/types/order"

export function OrderItemsList({ order }: { order: Order }) {
  return (
    <div className="space-y-3">
      <ul className="divide-y" aria-label="Items in this order">
        {order.items.map((item) => (
          <li key={item.order_item_id} className="flex items-start justify-between gap-3 py-3">
            <div>
              <p className="font-semibold">
                {item.product_name} <span className="text-muted-foreground">{item.size}</span>
              </p>
              <p className="text-small text-muted-foreground">
                {item.quantity} × {formatCurrency(item.unit_price)}
              </p>
            </div>
            <p className="font-bold">{formatCurrency(item.subtotal)}</p>
          </li>
        ))}
      </ul>
      <div className="flex items-baseline justify-between border-t pt-3">
        <span className="font-semibold">Total</span>
        <span className="text-price font-extrabold">{formatCurrency(order.total_amount)}</span>
      </div>
    </div>
  )
}
