/**
 * DashboardPage – route "/admin" (#30, FR-A1).
 *
 * Stat cards: total orders, today's orders, and one card per status, plus the
 * 5 most recent orders. Numbers only, no charts (out of scope for the POC).
 *
 * Data: GET /admin/orders gives `status_counts` across ALL orders, so
 * total = sum of the counts. "Today" is not in the contract, so we count the
 * orders dated today (India time) within the newest 100.
 * LIMITATION: if more than 100 orders arrive in one day, "today" would be
 * undercounted. FUTURE: add a `today_count` field to the API (suggested follow-up).
 */
import {
  Ban,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  type LucideIcon,
  PackageCheck,
  ShoppingBag,
  Truck,
} from 'lucide-react'
import { Link } from 'react-router'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAdminOrders } from '@/hooks/useAdminOrders'
import { formatCurrency, formatDateTime, formatOrderId, isTodayInIST } from '@/lib/format'
import { ORDER_STATUSES, STATUS_LABELS } from '@/lib/orderStatus'
import type { OrderStatus } from '@/types/order'

/** Icon + colour per status card, matching the status badge colours. */
const STATUS_CARD: Record<OrderStatus, { icon: LucideIcon; tone: string }> = {
  PLACED: { icon: ShoppingBag, tone: 'bg-primary-soft text-primary' },
  CONFIRMED: { icon: ClipboardCheck, tone: 'bg-indigo-50 text-indigo-700' },
  OUT_FOR_DELIVERY: { icon: Truck, tone: 'bg-amber-50 text-amber-700' },
  DELIVERED: { icon: CheckCircle2, tone: 'bg-green-50 text-green-700' },
  CANCELLED: { icon: Ban, tone: 'bg-red-50 text-red-700' },
}

export function DashboardPage() {
  const { data, isPending, isError, error, refetch } = useAdminOrders({ page: 1, page_size: 100 })

  if (isError) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <ErrorState error={error} onRetry={() => void refetch()} title="We could not load the dashboard" />
      </>
    )
  }

  if (isPending) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="h-[76px] rounded-2xl" />
          ))}
        </div>
      </>
    )
  }

  const totalOrders = ORDER_STATUSES.reduce((sum, status) => sum + data.status_counts[status], 0)
  const todayOrders = data.items.filter((order) => isTodayInIST(order.order_date)).length
  const recentOrders = data.items.slice(0, 5) // items are already newest first

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" description="Overview of all customer orders." />

      {/* Cards stack on mobile and form a grid on wider screens. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total orders" value={totalOrders} icon={PackageCheck} tone="bg-slate-100 text-slate-700" />
        <StatCard label="Today's orders" value={todayOrders} icon={CalendarDays} />
        {ORDER_STATUSES.map((status) => (
          <StatCard
            key={status}
            label={STATUS_LABELS[status]}
            value={data.status_counts[status]}
            icon={STATUS_CARD[status].icon}
            tone={STATUS_CARD[status].tone}
          />
        ))}
      </div>

      <Card className="gap-0 py-0">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-xl/7 font-bold">Recent orders</h2>
          <Link to="/admin/orders" className="flex items-center gap-1 font-semibold text-primary hover:underline">
            View all
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="px-5 py-8 text-center text-muted-foreground">No orders yet.</p>
        ) : (
          <ul className="divide-y">
            {recentOrders.map((order) => (
              <li key={order.order_id}>
                {/* ?order= opens that order's details sheet on the Orders page. */}
                <Link
                  to={`/admin/orders?order=${order.order_id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-muted/60"
                >
                  <span className="w-14 font-bold">{formatOrderId(order.order_id)}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{order.customer_name}</span>
                  <span className="hidden text-muted-foreground md:inline">{formatDateTime(order.order_date)}</span>
                  <span className="font-bold tabular-nums">{formatCurrency(order.total_amount)}</span>
                  <StatusBadge status={order.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
