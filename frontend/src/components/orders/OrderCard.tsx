/** OrderCard: one order in the customer's history list; opens the order details. */
import { Link } from "react-router"
import { ChevronRight, Repeat } from "lucide-react"

import { StatusBadge } from "@/components/common/StatusBadge"
import { formatCurrency, formatDateTime } from "@/lib/format"
import type { OrderSummary } from "@/types/order"

export function OrderCard({ order }: { order: OrderSummary }) {
  return (
    <Link
      to={`/orders/${order.order_id}`}
      className="flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-card transition-shadow hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-h3 font-semibold">Order #{order.order_id}</span>
          <StatusBadge status={order.status} />
          {order.subscription_id && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-small font-semibold text-primary">
              <Repeat className="size-3.5" aria-hidden="true" />
              Subscription
            </span>
          )}
        </div>
        <p className="text-small text-muted-foreground">
          {formatDateTime(order.order_date)} · {order.item_count}{" "}
          {order.item_count === 1 ? "item" : "items"}
        </p>
      </div>
      <span className="text-price font-extrabold">{formatCurrency(order.total_amount)}</span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  )
}
