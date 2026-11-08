/**
 * OrderSummaryCard – one order in the customer's history list (#29, FR-C7):
 * order id, date (IST), item count, total and status badge. The whole card
 * links to the order details page.
 */
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { StatusBadge } from '@/components/common/StatusBadge'
import { formatCurrency, formatDateTime, formatOrderId } from '@/lib/format'
import type { OrderSummary } from '@/types/order'

export function OrderSummaryCard({ order }: { order: OrderSummary }) {
  return (
    <li>
      <Link
        to={`/orders/${order.order_id}`}
        className="flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-card ring-1 ring-border/70 transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-bold">Order {formatOrderId(order.order_id)}</span>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(order.order_date)} · {order.item_count} {order.item_count === 1 ? 'item' : 'items'}
          </p>
        </div>
        <span className="text-base font-extrabold tabular-nums">{formatCurrency(order.total_amount)}</span>
        <ChevronRight className="size-5 text-muted-foreground" aria-hidden="true" />
      </Link>
    </li>
  )
}
