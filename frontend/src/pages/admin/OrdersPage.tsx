/**
 * Route: `/admin/orders` (FR-A2, FR-A3, FR-A4).
 * Filter by status, 20 per page, details sheet with the status update control.
 *
 * All view state lives in the URL query string, so refresh, Back and shared links keep it:
 *   ?status=PLACED   filter      ?page=2   pagination      ?order=101   open details sheet
 */
import { useState } from "react"
import { useSearchParams } from "react-router"
import { ChevronLeft, ChevronRight, ClipboardList } from "lucide-react"

import { OrderDetailsSheet } from "@/components/admin/OrderDetailsSheet"
import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { StatusBadge } from "@/components/common/StatusBadge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminOrders } from "@/hooks/useAdminOrders"
import { totalFromStatusCounts } from "@/lib/dashboard"
import { formatCurrency, formatDateTime } from "@/lib/format"
import { STATUS_LABELS } from "@/lib/orderStatus"
import { cn } from "@/lib/utils"
import { ORDER_STATUSES, type AdminOrderSummary, type OrderStatus } from "@/types/order"

export const ADMIN_PAGE_SIZE = 20

function readStatus(value: string | null): OrderStatus | undefined {
  return ORDER_STATUSES.find((s) => s === value)
}

function readPositiveInt(value: string | null): number | null {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : null
}

function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = readStatus(searchParams.get("status"))
  const page = readPositiveInt(searchParams.get("page")) ?? 1
  const openOrderId = readPositiveInt(searchParams.get("order"))

  const { data, isPending, isError, error, refetch, isFetching } = useAdminOrders({
    status,
    page,
    page_size: ADMIN_PAGE_SIZE,
  })

  /** Change some URL parameters, keeping the others. `null` removes one. */
  function updateParams(changes: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key)
      else next.set(key, value)
    }
    setSearchParams(next)
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / ADMIN_PAGE_SIZE)) : 1
  // The button/card that opened the sheet, so focus can go back to it on close.
  const [opener, setOpener] = useState<HTMLElement | null>(null)
  const openOrder = (id: number) => {
    setOpener(document.activeElement instanceof HTMLElement ? document.activeElement : null)
    updateParams({ order: String(id) })
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-h1 font-bold">Orders</h1>
        <p className="text-muted-foreground">Filter, open an order and update its status.</p>
      </div>

      {/* Status filter. Changing it goes back to page 1. */}
      <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
        {[undefined, ...ORDER_STATUSES].map((s) => {
          const selected = s === status
          const count = data ? (s ? data.status_counts[s] : totalFromStatusCounts(data.status_counts)) : null
          return (
            <button
              key={s ?? "ALL"}
              type="button"
              aria-pressed={selected}
              onClick={() => updateParams({ status: s ?? null, page: null })}
              className={cn(
                "h-10 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                selected
                  ? "bg-primary text-primary-foreground"
                  : "border bg-surface hover:bg-primary-soft hover:text-primary",
              )}
            >
              {s ? STATUS_LABELS[s] : "All"}
              {count !== null && <span className="ml-1.5 opacity-75">{count}</span>}
            </button>
          )
        })}
      </div>

      {isPending ? (
        <div className="space-y-2 rounded-2xl bg-surface p-4 shadow-card" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState title="We could not load the orders" error={error} onRetry={() => refetch()} retrying={isFetching} />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={status ? `No ${STATUS_LABELS[status].toLowerCase()} orders` : "No orders yet"}
          description={
            page > 1
              ? "There are no orders on this page."
              : status
                ? "Try another status filter."
                : "New orders will appear here as soon as customers place them."
          }
          action={
            status || page > 1 ? (
              <Button variant="outline" onClick={() => updateParams({ status: null, page: null })}>
                Show all orders
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <OrdersTable orders={data.items} onOpen={openOrder} />
          <OrderCards orders={data.items} onOpen={openOrder} />
        </>
      )}

      {data && data.total > 0 && (
        <nav aria-label="Pagination" className="flex items-center justify-between gap-3">
          <p className="text-small text-muted-foreground">
            Page {page} of {totalPages} · {data.total} {data.total === 1 ? "order" : "orders"}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" disabled={page <= 1} onClick={() => updateParams({ page: String(page - 1) })}>
              <ChevronLeft aria-hidden="true" /> Previous
            </Button>
            <Button
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => updateParams({ page: String(page + 1) })}
            >
              Next <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </nav>
      )}

      <OrderDetailsSheet
        orderId={openOrderId}
        onClose={() => updateParams({ order: null })}
        returnFocusTo={opener}
      />
    </div>
  )
}

/** Desktop/tablet (≥ 768px): a table. */
function OrdersTable({ orders, onOpen }: { orders: AdminOrderSummary[]; onOpen: (id: number) => void }) {
  return (
    <div className="hidden overflow-hidden rounded-2xl bg-surface p-2 shadow-card md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="sr-only">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.order_id}>
              <TableCell className="font-bold">#{order.order_id}</TableCell>
              <TableCell>{order.customer_name}</TableCell>
              <TableCell className="tabular-nums">{order.customer_phone}</TableCell>
              <TableCell>{formatDateTime(order.order_date)}</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(order.total_amount)}</TableCell>
              <TableCell>
                <StatusBadge status={order.status} />
              </TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" onClick={() => onOpen(order.order_id)}>
                  View<span className="sr-only"> order {order.order_id}</span>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/** Phones (< 768px): cards instead of a wide table. */
function OrderCards({ orders, onOpen }: { orders: AdminOrderSummary[]; onOpen: (id: number) => void }) {
  return (
    <ul className="space-y-3 md:hidden" aria-label="Orders">
      {orders.map((order) => (
        <li key={order.order_id}>
          <button
            type="button"
            onClick={() => onOpen(order.order_id)}
            className="w-full space-y-2 rounded-2xl bg-surface p-4 text-left shadow-card focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold">#{order.order_id}</span>
              <StatusBadge status={order.status} />
            </div>
            <div className="flex items-end justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold">{order.customer_name}</p>
                <p className="text-small text-muted-foreground">
                  {order.customer_phone} · {formatDateTime(order.order_date)}
                </p>
              </div>
              <span className="font-bold">{formatCurrency(order.total_amount)}</span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}

export default OrdersPage
