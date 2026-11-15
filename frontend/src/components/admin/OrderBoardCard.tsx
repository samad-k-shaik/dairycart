/**
 * OrderBoardCard (#104): one order on the admin Orders board, in the card style of the
 * design: customer + #number, time, delivery slot (or one-time), "Order (N)" with the
 * total, the first item lines with prices, "See more", and a coloured status badge.
 * The whole card is a button that opens the order panel.
 */
import { CheckCheck, ChevronRight, Clock, Repeat, ShoppingBag, Sparkles, ThumbsUp, Truck, XCircle } from "lucide-react"

import { formatCurrency } from "@/lib/format"
import { cardLines, formatCardTime, orderNumber } from "@/lib/orderBoard"
import { STATUS_LABELS } from "@/lib/orderStatus"
import { cn } from "@/lib/utils"
import type { AdminOrderSummary, OrderStatus } from "@/types/order"

/** Badge colour and icon per status (like New / Cooking / Ready / Completed / Cancelled). */
const BADGE: Record<OrderStatus, { className: string; Icon: typeof Sparkles }> = {
  PLACED: { className: "bg-violet-50 text-violet-700", Icon: Sparkles },
  CONFIRMED: { className: "bg-orange-50 text-orange-700", Icon: ThumbsUp },
  OUT_FOR_DELIVERY: { className: "bg-sky-50 text-sky-700", Icon: Truck },
  DELIVERED: { className: "bg-green-50 text-green-700", Icon: CheckCheck },
  CANCELLED: { className: "bg-red-50 text-red-700", Icon: XCircle },
}

export function OrderBoardCard({ order, onOpen }: { order: AdminOrderSummary; onOpen: () => void }) {
  const items = order.items ?? []
  const { shown, more } = cardLines(items)
  const badge = BADGE[order.status]
  const count = items.length || order.item_count
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Order ${order.order_id}, ${order.customer_name}, ${STATUS_LABELS[order.status]}`}
      className="flex h-full w-full flex-col rounded-2xl border bg-surface p-4 text-left shadow-card transition-shadow hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate text-h3 font-semibold">{order.customer_name}</span>
        <span className="shrink-0 text-small text-muted-foreground">{orderNumber(order.order_id)}</span>
      </div>
      <p className="mt-1 flex items-center gap-1.5 text-small text-muted-foreground">
        <Clock className="size-4 shrink-0" aria-hidden="true" />
        {formatCardTime(order.order_date)}
      </p>
      <p className="mt-0.5 flex items-center gap-1.5 text-small text-muted-foreground">
        {order.subscription_id ? (
          <Repeat className="size-4 shrink-0" aria-hidden="true" />
        ) : (
          <ShoppingBag className="size-4 shrink-0" aria-hidden="true" />
        )}
        <span className="truncate">{order.delivery_slot ?? (order.subscription_id ? "Subscription" : "One-time")}</span>
      </p>

      <div className="my-3 border-t border-dashed" />

      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold">
          Order <span className="font-normal text-muted-foreground">({count})</span>
        </span>
        <span className="font-semibold text-green-700">{formatCurrency(order.total_amount)}</span>
      </div>
      <ul className="mt-1 space-y-0.5 text-small text-muted-foreground">
        {shown.map((item) => (
          <li key={item.product_id} className="flex justify-between gap-2">
            <span className="min-w-0 truncate">
              {item.quantity}× {item.product_name} {item.size}
            </span>
            <span className="shrink-0 text-foreground">{formatCurrency(item.subtotal)}</span>
          </li>
        ))}
      </ul>
      {more > 0 && (
        <span className="mt-1.5 flex items-center justify-end gap-0.5 text-small font-semibold text-green-700">
          See more <ChevronRight className="size-4" aria-hidden="true" />
        </span>
      )}

      {/* mt-auto: the badge sits at the bottom, so cards in a row line up */}
      <span className="mt-auto pt-4">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-small font-semibold",
            badge.className,
          )}
        >
          <badge.Icon className="size-4" aria-hidden="true" />
          {STATUS_LABELS[order.status]}
        </span>
      </span>
    </button>
  )
}
