/**
 * OrdersPage – route "/admin/orders" (#31, FR-A2, FR-A3, FR-A4).
 *
 * - Status filter chips + pagination (20 per page), newest first.
 * - Desktop: a table. Mobile (< md): cards, because a wide table is unusable at 360px.
 * - Clicking an order opens the OrderDetailsSheet with items and the status control.
 *
 * FILTER, PAGE AND OPEN ORDER LIVE IN THE URL: /admin/orders?status=PLACED&page=2&order=101
 * WHY? The view survives a refresh, can be bookmarked/shared, and the browser's
 * Back button works as expected. `useSearchParams` reads and writes them.
 */
import { ChevronRight, Inbox } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { OrderDetailsSheet } from '@/components/admin/OrderDetailsSheet'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAdminOrders } from '@/hooks/useAdminOrders'
import { ADMIN_PAGE_SIZE } from '@/lib/constants'
import { formatCurrency, formatDateTime, formatOrderId } from '@/lib/format'
import { isOrderStatus, ORDER_STATUSES, STATUS_LABELS } from '@/lib/orderStatus'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/types/order'

export function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Read and SANITISE the URL: anyone can type ?status=banana&page=-5.
  const statusParam = searchParams.get('status')
  const status: OrderStatus | undefined = isOrderStatus(statusParam) ? statusParam : undefined
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1)
  const openOrderId = Number(searchParams.get('order')) || null

  const { data, isPending, isError, error, refetch, isPlaceholderData } = useAdminOrders({
    status,
    page,
    page_size: ADMIN_PAGE_SIZE,
  })

  /** Changes some URL parameters while keeping the others. `null` removes a parameter. */
  function updateParams(changes: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key)
      else next.set(key, value)
    }
    setSearchParams(next)
  }

  const setStatusFilter = (value: OrderStatus | undefined) => updateParams({ status: value ?? null, page: null })
  const openOrder = (orderId: number) => updateParams({ order: String(orderId) })
  const closeOrder = () => updateParams({ order: null })

  const allCount = data ? ORDER_STATUSES.reduce((sum, s) => sum + data.status_counts[s], 0) : undefined
  const filters: { value: OrderStatus | undefined; label: string; count?: number }[] = [
    { value: undefined, label: 'All', count: allCount },
    ...ORDER_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s], count: data?.status_counts[s] })),
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Orders" description="All customer orders, newest first." />

      {/* Status filter chips (scroll sideways on small screens). */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" aria-label="Filter by status">
        {filters.map((filter) => {
          const selected = filter.value === status
          return (
            <button
              key={filter.label}
              type="button"
              aria-pressed={selected}
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                'flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 font-semibold transition-colors',
                selected ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-surface text-muted-foreground hover:text-foreground',
              )}
            >
              {filter.label}
              {filter.count !== undefined && <span className="text-xs tabular-nums opacity-70">{filter.count}</span>}
            </button>
          )
        })}
      </div>

      {isError && <ErrorState error={error} onRetry={() => void refetch()} title="We could not load orders" />}

      {isPending && (
        <div className="flex flex-col gap-2" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      )}

      {data && data.items.length === 0 && (
        <EmptyState
          icon={Inbox}
          title="No orders here"
          description={status ? `There are no ${STATUS_LABELS[status].toLowerCase()} orders.` : 'No orders have been placed yet.'}
        />
      )}

      {data && data.items.length > 0 && (
        // Dim the old page slightly while the next page loads (keepPreviousData).
        <div className={cn('transition-opacity', isPlaceholderData && 'opacity-60')}>
          {/* Desktop / tablet: table */}
          <Card className="hidden gap-0 py-0 md:flex">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-5">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((order) => (
                  <TableRow key={order.order_id} className="cursor-pointer" onClick={() => openOrder(order.order_id)}>
                    <TableCell className="pl-5 font-bold">{formatOrderId(order.order_id)}</TableCell>
                    <TableCell className="font-semibold">{order.customer_name}</TableCell>
                    <TableCell className="text-muted-foreground">{order.customer_phone}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(order.order_date)}</TableCell>
                    <TableCell className="text-right font-bold tabular-nums">{formatCurrency(order.total_amount)}</TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      {/* A real button so keyboard users can open the row (rows themselves are not focusable). */}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation() // the row's onClick would open it twice
                          openOrder(order.order_id)
                        }}
                        className="font-semibold text-primary hover:underline"
                      >
                        View<span className="sr-only"> order {formatOrderId(order.order_id)}</span>
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile: cards */}
          <ul className="flex flex-col gap-2 md:hidden">
            {data.items.map((order) => (
              <li key={order.order_id}>
                <button
                  type="button"
                  onClick={() => openOrder(order.order_id)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-surface p-4 text-left shadow-card ring-1 ring-border/70"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">{formatOrderId(order.order_id)}</span>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="truncate font-semibold">{order.customer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.customer_phone} · {formatDateTime(order.order_date)}
                    </p>
                  </div>
                  <span className="font-extrabold tabular-nums">{formatCurrency(order.total_amount)}</span>
                  <ChevronRight className="size-5 text-muted-foreground" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>

          <Pagination
            page={data.page}
            pageSize={data.page_size}
            total={data.total}
            onPageChange={(next) => updateParams({ page: String(next) })}
          />
        </div>
      )}

      <OrderDetailsSheet orderId={openOrderId} onClose={closeOrder} />
    </div>
  )
}
