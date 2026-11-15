/**
 * Route: `/admin/orders` (FR-A2, FR-A3, FR-A4; #104 Orders board).
 *
 * One page for every order (the #101 Deliveries page was merged in): status chips with
 * counts, search, a day (Today by default) or All dates, a delivery boy filter, and a
 * grid of order cards. A card opens the order panel (address, items, status change).
 *
 * All view state lives in the URL, so refresh, Back and shared links keep it:
 *   ?status=PLACED  ?date=2026-11-20 | all  ?boy=3 | unassigned  ?q=ravi  ?order=101
 * A day = subscription deliveries for that date + one-time orders placed that day.
 */
import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { Bike, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Loader2, Search, X } from "lucide-react"

import { OrderBoardCard } from "@/components/admin/OrderBoardCard"
import { OrderDetailsSheet } from "@/components/admin/OrderDetailsSheet"
import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useOrderBoard } from "@/hooks/useOrderBoard"
import { totalFromStatusCounts } from "@/lib/dashboard"
import { dayLabel, readDate } from "@/lib/deliveries"
import { readBoyFilter } from "@/lib/deliveryBoy"
import { readBoardDate } from "@/lib/orderBoard"
import { STATUS_LABELS } from "@/lib/orderStatus"
import { addDays, todayInIndia } from "@/lib/subscription"
import { cn } from "@/lib/utils"
import { ORDER_STATUSES, type OrderStatus } from "@/types/order"

function readStatus(value: string | null): OrderStatus | undefined {
  return ORDER_STATUSES.find((s) => s === value)
}

function readPositiveInt(value: string | null): number | null {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : null
}

function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const today = todayInIndia()
  const status = readStatus(searchParams.get("status"))
  const date = readBoardDate(searchParams.get("date"), today)
  const boy = readBoyFilter(searchParams.get("boy"))
  const q = (searchParams.get("q") ?? "").trim()
  const openOrderId = readPositiveInt(searchParams.get("order"))

  const board = useOrderBoard({
    status,
    date: date === "all" ? undefined : date,
    boy: boy || undefined,
    q: q || undefined,
  })
  const first = board.data?.pages[0]
  // While a new filter loads, the old cards stay (dimmed) but their counts would be wrong.
  const counts = board.isPlaceholderData ? undefined : first
  const orders = board.data?.pages.flatMap((page) => page.items) ?? []

  /** Change some URL parameters, keeping the others. `null` removes one. */
  function updateParams(changes: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key)
      else next.set(key, value)
    }
    setSearchParams(next, { replace: true })
  }
  const goToDay = (day: string) => updateParams({ date: day === today ? null : day })

  // The card that opened the panel, so focus can go back to it on close.
  const [opener, setOpener] = useState<HTMLElement | null>(null)
  const openOrder = (id: number) => {
    setOpener(document.activeElement instanceof HTMLElement ? document.activeElement : null)
    updateParams({ order: String(id) })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="space-y-1">
          <h1 className="text-h1 font-bold">Orders</h1>
          <p className="text-muted-foreground">Today's deliveries and every order. Open a card to change its status.</p>
        </div>
        <Link
          to="/admin/delivery-boys"
          className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary hover:underline"
        >
          <Bike className="size-4" aria-hidden="true" />
          Delivery boys and areas
        </Link>
      </div>

      {/* Toolbar: status chips on the left; search and day on the right */}
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
          {[undefined, ...ORDER_STATUSES].map((s) => {
            const selected = s === status
            const count = counts ? (s ? counts.status_counts[s] : totalFromStatusCounts(counts.status_counts)) : null
            return (
              <button
                key={s ?? "ALL"}
                type="button"
                aria-pressed={selected}
                onClick={() => updateParams({ status: s ?? null })}
                className={cn(
                  "inline-flex h-11 items-center gap-2 rounded-xl border px-3 font-semibold transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                  selected ? "border-primary bg-primary text-primary-foreground" : "bg-surface hover:bg-muted",
                )}
              >
                {s ? STATUS_LABELS[s] : "All"}
                {count !== null && (
                  <span
                    className={cn(
                      "min-w-6 rounded-full px-1.5 text-center text-small",
                      selected ? "bg-white/25" : "bg-primary-soft text-primary",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchBox value={q} onChange={(value) => updateParams({ q: value || null })} />

        {/* Day: ‹ date › and All dates */}
        <div role="group" aria-label="Choose a day" className="flex flex-wrap items-center gap-2">
          {date !== "all" && (
            <Button variant="outline" size="icon-lg" aria-label="Previous day" onClick={() => goToDay(addDays(date, -1))}>
              <ChevronLeft aria-hidden="true" />
            </Button>
          )}
          <label
            className={cn(
              "relative inline-flex h-11 items-center gap-2 rounded-full border bg-surface px-4 font-semibold",
              date === "all" && "text-muted-foreground",
            )}
          >
            <CalendarDays className="size-4 text-primary" aria-hidden="true" />
            <span data-testid="day-label">{date === "all" ? "Pick a day" : dayLabel(date, today)}</span>
            {/* The native date picker covers the button, so tapping it opens the calendar. */}
            <input
              type="date"
              aria-label="Day"
              className="absolute inset-0 cursor-pointer opacity-0"
              value={date === "all" ? "" : date}
              onChange={(e) => {
                const picked = readDate(e.target.value)
                if (picked) goToDay(picked)
              }}
            />
          </label>
          {date !== "all" && (
            <Button variant="outline" size="icon-lg" aria-label="Next day" onClick={() => goToDay(addDays(date, 1))}>
              <ChevronRight aria-hidden="true" />
            </Button>
          )}
          <Button
            variant={date === "all" ? "default" : "outline"}
            className="h-11 rounded-full"
            aria-pressed={date === "all"}
            onClick={() => updateParams({ date: date === "all" ? null : "all" })}
          >
            All dates
          </Button>
          {date !== "all" && date !== today && (
            <Button variant="ghost" className="h-11" onClick={() => goToDay(today)}>
              Today
            </Button>
          )}
        </div>

        {/* Delivery boy filter (#103) */}
        <Select value={boy || "all"} onValueChange={(value) => updateParams({ boy: value === "all" ? null : value })}>
          <SelectTrigger className="h-11 w-full sm:w-56" aria-label="Delivery boy">
            <Bike className="size-4 text-primary" aria-hidden="true" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All delivery boys</SelectItem>
            {counts?.boy_counts?.map((c) => (
              <SelectItem key={c.delivery_boy_id} value={String(c.delivery_boy_id)}>
                {c.name} ({c.orders})
              </SelectItem>
            ))}
            {/* A chosen boy with no orders in this view still needs an item to show. */}
            {boy && boy !== "unassigned" && !counts?.boy_counts?.some((c) => String(c.delivery_boy_id) === boy) && (
              <SelectItem value={boy}>Chosen delivery boy</SelectItem>
            )}
            <SelectItem value="unassigned">
              Not assigned{counts ? ` (${counts.unassigned_count ?? 0})` : ""}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {board.isPending ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : board.isError ? (
        <ErrorState
          title="We could not load the orders"
          error={board.error}
          onRetry={() => board.refetch()}
          retrying={board.isFetching}
        />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={
            q || status || boy
              ? "No orders match these filters"
              : date === "all"
                ? "No orders yet"
                : `No orders ${date === today ? "today" : "on this day"}`
          }
          description={
            q || status || boy
              ? "Try another status, delivery boy or search."
              : "Subscription deliveries appear on their day, and one-time orders on the day they are placed."
          }
          action={
            q || status || boy ? (
              <Button variant="outline" onClick={() => updateParams({ q: null, status: null, boy: null })}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <ul
            className={cn(
              "grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
              board.isPlaceholderData && "opacity-60 transition-opacity",
            )}
            aria-label="Orders"
            aria-busy={board.isFetching}
          >
            {orders.map((order) => (
              <li key={order.order_id}>
                <OrderBoardCard order={order} onOpen={() => openOrder(order.order_id)} />
              </li>
            ))}
          </ul>
          <div className="flex flex-col items-center gap-2">
            <p className="text-small text-muted-foreground">
              Showing {orders.length} of {first?.total ?? orders.length}{" "}
              {first?.total === 1 ? "order" : "orders"}
            </p>
            {board.hasNextPage && (
              <Button
                variant="outline"
                className="h-11"
                onClick={() => board.fetchNextPage()}
                disabled={board.isFetchingNextPage}
              >
                {board.isFetchingNextPage && <Loader2 className="animate-spin" aria-hidden="true" />}
                Load more
              </Button>
            )}
          </div>
        </>
      )}

      <OrderDetailsSheet orderId={openOrderId} onClose={() => updateParams({ order: null })} returnFocusTo={opener} />
    </div>
  )
}

/** Search box: name, phone or order number. Waits until typing pauses before searching. */
function SearchBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [text, setText] = useState(value)
  // The last search WE put in the URL. When the URL changes for another reason (Back /
  // Forward), the box follows it; our own changes must not overwrite newer typing.
  const sent = useRef(value)
  useEffect(() => {
    if (value !== sent.current) {
      sent.current = value
      setText(value)
    }
  }, [value])
  const send = useCallback(
    (next: string) => {
      sent.current = next
      onChange(next)
    },
    [onChange],
  )
  useEffect(() => {
    if (text.trim() === sent.current) return
    const timer = setTimeout(() => send(text.trim()), 300)
    return () => clearTimeout(timer)
  }, [text, send])

  return (
    <div className="relative w-full sm:w-64">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        type="search"
        aria-label="Search orders by name, phone or order number"
        placeholder="Name, phone or #order"
        className="h-11 rounded-full pr-10 pl-9"
        value={text}
        maxLength={100}
        onChange={(e) => setText(e.target.value)}
      />
      {text && (
        <button
          type="button"
          aria-label="Clear search"
          className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-full hover:bg-muted"
          onClick={() => {
            setText("")
            send("")
          }}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

export default OrdersPage
