/**
 * Route: `/admin/income` (#105). Income overview for a period (default: this month).
 *
 * Income = DELIVERED orders (cash on delivery), counted on their delivery day; every
 * figure is compared with the previous period of the same length. Charts: Recharts
 * (ADR-016). Delivery charges, expenses, profit and payment status are not shown: the
 * app has no data for them.
 *
 * The period lives in the URL (?from=YYYY-MM-DD&to=YYYY-MM-DD).
 */
import { useSearchParams } from "react-router"
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  IndianRupee,
  Lightbulb,
  MapPin,
  Milk,
  Repeat,
  ShoppingBag,
  TrendingUp,
} from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { ErrorState } from "@/components/common/ErrorState"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useIncome } from "@/hooks/useIncome"
import { readDate } from "@/lib/deliveries"
import { formatCurrency } from "@/lib/format"
import {
  changeLabel,
  chartMoney,
  compactRupees,
  formatLitres,
  matchPreset,
  monthLabel,
  presetPeriod,
  PRESETS,
  shortDay,
  type Period,
} from "@/lib/income"
import { formatDay, todayInIndia } from "@/lib/subscription"
import { cn } from "@/lib/utils"
import type { IncomeReport } from "@/types/income"

const BLUE = "var(--primary)"
const GREEN = "var(--success)"
/** Product donut colours (blue first, like the design). */
const PRODUCT_COLOURS = ["#2563eb", "#16a34a", "#f59e0b", "#8b5cf6", "#38bdf8", "#f43f5e", "#64748b"]

function IncomePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const today = todayInIndia()
  const fallback = presetPeriod("month", today)
  const from = readDate(searchParams.get("from")) ?? fallback.from
  const to = readDate(searchParams.get("to")) ?? fallback.to
  const period: Period = from <= to ? { from, to } : fallback
  const query = useIncome(period.from, period.to)
  const active = matchPreset(period, today)

  function choose(next: Period) {
    const preset = matchPreset(next, today)
    setSearchParams(preset === "month" ? {} : { from: next.from, to: next.to }, { replace: true })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-h1 font-bold">Income</h1>
          <p className="text-muted-foreground">Income from delivered orders, for the period you choose.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex h-11 items-center gap-2 rounded-xl border bg-surface px-3 text-small">
            <CalendarDays className="size-4 text-primary" aria-hidden="true" />
            <label className="sr-only" htmlFor="income-from">
              From
            </label>
            <input
              id="income-from"
              type="date"
              className="bg-transparent"
              value={period.from}
              max={period.to}
              onChange={(e) => readDate(e.target.value) && choose({ from: e.target.value, to: period.to })}
            />
            <span aria-hidden="true">–</span>
            <label className="sr-only" htmlFor="income-to">
              To
            </label>
            <input
              id="income-to"
              type="date"
              className="bg-transparent"
              value={period.to}
              min={period.from}
              onChange={(e) => readDate(e.target.value) && choose({ from: period.from, to: e.target.value })}
            />
          </div>
          <div role="group" aria-label="Period" className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={active === p.id}
                onClick={() => choose(presetPeriod(p.id, today))}
                className={cn(
                  "h-11 rounded-xl border px-3 font-semibold transition-colors",
                  active === p.id ? "border-primary bg-primary text-primary-foreground" : "bg-surface hover:bg-muted",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {query.isPending ? (
        <div className="space-y-4" aria-hidden="true">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      ) : query.isError ? (
        <ErrorState
          title="We could not load the income"
          error={query.error}
          onRetry={() => query.refetch()}
          retrying={query.isFetching}
        />
      ) : (
        <div
          className={cn("space-y-4", query.isPlaceholderData && "opacity-60 transition-opacity")}
          aria-busy={query.isFetching}
        >
          <p className="text-small text-muted-foreground" data-testid="period-note">
            {formatDay(query.data.start)} – {formatDay(query.data.end)} ({query.data.days}{" "}
            {query.data.days === 1 ? "day" : "days"}), compared with {formatDay(query.data.previous_start)} –{" "}
            {formatDay(query.data.previous_end)}.
          </p>
          <Report data={query.data} />
        </div>
      )}
    </div>
  )
}

function Report({ data }: { data: IncomeReport }) {
  const s = data.summary
  return (
    <>
      <section aria-label="Summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={Milk} tone="blue" label="Milk sold" value={formatLitres(s.litres)} change={s.litres_change} />
        <StatCard
          icon={IndianRupee}
          tone="green"
          label="Income"
          value={formatCurrency(s.income)}
          change={s.income_change}
        />
        <StatCard
          icon={TrendingUp}
          tone="blue"
          label="Average per day"
          value={formatCurrency(s.avg_daily_income)}
          change={s.avg_daily_change}
        />
        <StatCard
          icon={ClipboardCheck}
          tone="green"
          label="Delivered orders"
          value={String(s.delivered_orders)}
          change={s.delivered_orders_change}
        />
        <StatCard
          icon={Clock}
          tone="orange"
          label="Pending (not delivered yet)"
          value={formatCurrency(s.pending_income)}
          note={`${s.pending_orders} ${s.pending_orders === 1 ? "order" : "orders"}`}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Daily income" className="lg:col-span-1">
          <DailyChart data={data.daily} />
        </Panel>
        <Panel title="Monthly income (last 6 months)">
          <MonthlyChart data={data.monthly} />
        </Panel>
        <Panel title="Income by order type">
          <TypeDonut data={data} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Product breakdown">
          <ProductDonut data={data} />
        </Panel>
        <Panel title="Delivery area performance" className="lg:col-span-2">
          <AreaTable data={data} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Recent delivered orders" className="lg:col-span-2">
          <RecentTable data={data} />
        </Panel>
        <div className="space-y-4">
          <Panel title="Subscriptions">
            <div className="grid grid-cols-2 gap-3">
              <MiniStat icon={Repeat} label="Active subscriptions" value={String(data.subscriptions.active)} />
              <MiniStat
                icon={IndianRupee}
                label="Subscription income"
                value={formatCurrency(data.subscriptions.income)}
                change={data.subscriptions.income_change}
              />
            </div>
          </Panel>
          <section aria-labelledby="insights-heading" className="space-y-3 rounded-2xl bg-green-50 p-4 shadow-card">
            <h2 id="insights-heading" className="flex items-center gap-2 text-h3 font-semibold">
              <Lightbulb className="size-5 text-green-700" aria-hidden="true" />
              Key insights
            </h2>
            <ul className="space-y-2" data-testid="insights">
              {data.insights.map((line) => (
                <li key={line} className="flex gap-2 text-small">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-700" aria-hidden="true" />
                  {line}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  )
}

// ---- building blocks ----

const TONES = {
  blue: "bg-primary-soft text-primary",
  green: "bg-green-50 text-green-700",
  orange: "bg-orange-50 text-orange-700",
}

function StatCard({
  icon: Icon,
  tone,
  label,
  value,
  change,
  note,
}: {
  icon: typeof Milk
  tone: keyof typeof TONES
  label: string
  value: string
  change?: number | null
  note?: string
}) {
  return (
    <div className="flex gap-3 rounded-2xl bg-surface p-4 shadow-card" data-testid={`card-${label}`}>
      <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", TONES[tone])}>
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-small font-semibold">{label}</p>
        <p className="truncate text-price font-extrabold">{value}</p>
        {note ? <p className="text-small text-muted-foreground">{note}</p> : <Change value={change ?? null} />}
      </div>
    </div>
  )
}

function Change({ value }: { value: number | null }) {
  const label = changeLabel(value)
  if (label === null) return <p className="text-small text-muted-foreground">No earlier data</p>
  const up = (value ?? 0) >= 0
  const Arrow = up ? ArrowUpRight : ArrowDownRight
  return (
    <p className="flex items-center gap-1 text-small">
      <span className={cn("inline-flex items-center font-semibold", up ? "text-green-700" : "text-danger")}>
        <Arrow className="size-4" aria-hidden="true" />
        {label}
      </span>
      <span className="text-muted-foreground">vs. last period</span>
    </p>
  )
}

function MiniStat({
  icon: Icon,
  label,
  value,
  change,
}: {
  icon: typeof Milk
  label: string
  value: string
  change?: number | null
}) {
  return (
    <div className="rounded-xl bg-primary-soft/60 p-3">
      <Icon className="mb-1 size-4 text-primary" aria-hidden="true" />
      <p className="text-h3 font-bold">{value}</p>
      <p className="text-small text-muted-foreground">{label}</p>
      {change !== undefined && <Change value={change} />}
    </div>
  )
}

function Panel({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("min-w-0 space-y-3 rounded-2xl bg-surface p-4 shadow-card", className)} aria-label={title}>
      <h2 className="text-h3 font-semibold">{title}</h2>
      {children}
    </section>
  )
}

// Recharts passes numbers (e.g. 850); formatCurrency needs "850.00".
const rupeeTooltip = (value: unknown) => formatCurrency(chartMoney(value))

function DailyChart({ data }: { data: IncomeReport["daily"] }) {
  const points = data.map((d) => ({ day: shortDay(d.date), income: Number(d.income), orders: d.orders }))
  return (
    <div className="h-56" data-testid="daily-chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="income-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GREEN} stopOpacity={0.35} />
              <stop offset="100%" stopColor={GREEN} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={16} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={compactRupees} width={52} />
          <Tooltip formatter={rupeeTooltip} />
          <Area
            type="monotone"
            dataKey="income"
            name="Income"
            stroke={GREEN}
            strokeWidth={2}
            fill="url(#income-fill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function MonthlyChart({ data }: { data: IncomeReport["monthly"] }) {
  const bars = data.map((m) => ({ month: monthLabel(m.month), income: Number(m.income) }))
  return (
    <div className="h-56" data-testid="monthly-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={bars} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={compactRupees} width={52} />
          <Tooltip formatter={rupeeTooltip} />
          <Bar dataKey="income" name="Income" fill={BLUE} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function Donut({
  slices,
  centre,
  centreLabel,
}: {
  slices: { name: string; value: number; colour: string }[]
  centre: string
  centreLabel: string
}) {
  const empty = slices.every((s) => s.value === 0)
  return (
    <div className="relative h-44 w-44 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={empty ? [{ name: "None", value: 1, colour: "var(--muted)" }] : slices}
            dataKey="value"
            nameKey="name"
            innerRadius="68%"
            outerRadius="100%"
            stroke="none"
            isAnimationActive={false}
          >
            {(empty ? [{ colour: "var(--muted)" }] : slices).map((s, i) => (
              <Cell key={i} fill={s.colour} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-extrabold">{centre}</span>
        <span className="text-xs text-muted-foreground">{centreLabel}</span>
      </div>
    </div>
  )
}

function TypeDonut({ data }: { data: IncomeReport }) {
  const rows = data.by_type.map((t) => ({
    name: t.type === "SUBSCRIPTION" ? "Subscription" : "One-time orders",
    value: Number(t.income),
    colour: t.type === "SUBSCRIPTION" ? "#2563eb" : "#16a34a",
    share: t.share,
    income: t.income,
    Icon: t.type === "SUBSCRIPTION" ? Repeat : ShoppingBag,
  }))
  return (
    <div className="flex flex-wrap items-center gap-4" data-testid="type-donut">
      <Donut slices={rows} centre={formatCurrency(data.summary.income)} centreLabel="Total income" />
      <ul className="min-w-0 flex-1 space-y-3">
        {rows.map((r) => (
          <li key={r.name} className="space-y-0.5">
            <p className="flex items-center gap-2 font-semibold">
              <span className="size-3 rounded-full" style={{ background: r.colour }} aria-hidden="true" />
              {r.name}
            </p>
            <p className="flex justify-between gap-2 text-small text-muted-foreground">
              <span>{r.share}%</span>
              <span className="font-semibold text-foreground">{formatCurrency(r.income)}</span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ProductDonut({ data }: { data: IncomeReport }) {
  if (data.by_product.length === 0)
    return <p className="text-small text-muted-foreground">No delivered products yet.</p>
  const slices = data.by_product.map((p, i) => ({
    name: `${p.name} ${p.size}`,
    value: Number(p.income),
    colour: PRODUCT_COLOURS[i % PRODUCT_COLOURS.length],
  }))
  return (
    // The donut sits above the list, so the product names always have the full width.
    <div className="space-y-4" data-testid="product-donut">
      <div className="flex justify-center">
        <Donut slices={slices} centre={formatLitres(data.summary.litres)} centreLabel="milk sold" />
      </div>
      <ul className="space-y-1.5 text-small">
        {data.by_product.map((p, i) => (
          <li key={p.product_id} className="flex items-center gap-2">
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ background: slices[i].colour }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
              {p.name} <span className="text-muted-foreground">{p.size}</span>
            </span>
            <span className="w-12 text-right text-muted-foreground">{p.share}%</span>
            <span className="w-14 text-right font-semibold">
              {p.litres !== null ? formatLitres(p.litres) : `× ${p.quantity}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AreaTable({ data }: { data: IncomeReport }) {
  if (data.by_area.length === 0) return <p className="text-small text-muted-foreground">No delivered orders yet.</p>
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Area</TableHead>
            <TableHead className="text-right">Milk</TableHead>
            <TableHead className="text-right">Income</TableHead>
            <TableHead className="hidden text-right sm:table-cell">Customers</TableHead>
            <TableHead className="text-right">Growth</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.by_area.map((a) => (
            <TableRow key={a.pincode ?? "none"}>
              <TableCell>
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  {a.pincode ? (
                    <span>
                      {a.area_name ?? a.pincode}
                      {a.area_name && <span className="block text-xs text-muted-foreground">{a.pincode}</span>}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">No address (older orders)</span>
                  )}
                </span>
              </TableCell>
              <TableCell className="text-right">{formatLitres(a.litres)}</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(a.income)}</TableCell>
              <TableCell className="hidden text-right sm:table-cell">{a.customers}</TableCell>
              <TableCell className="text-right">
                {a.growth === null ? (
                  <span className="text-muted-foreground">New</span>
                ) : (
                  <span className={cn("font-semibold", a.growth >= 0 ? "text-green-700" : "text-danger")}>
                    {changeLabel(a.growth)}
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function RecentTable({ data }: { data: IncomeReport }) {
  if (data.recent.length === 0) return <p className="text-small text-muted-foreground">No delivered orders yet.</p>
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead className="hidden sm:table-cell">Order type</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="hidden sm:table-cell">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.recent.map((r) => (
          <TableRow key={r.order_id}>
            <TableCell className="whitespace-nowrap">{formatDay(r.date)}</TableCell>
            <TableCell>
              {r.customer_name}
              <span className="block text-xs text-muted-foreground">#{r.order_id}</span>
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              {r.type === "SUBSCRIPTION" ? "Subscription" : "One-time"}
            </TableCell>
            <TableCell className="text-right font-semibold">{formatCurrency(r.amount)}</TableCell>
            <TableCell className="hidden sm:table-cell">
              <span className="rounded-lg bg-green-50 px-2 py-0.5 text-small font-semibold text-green-700">
                Delivered
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default IncomePage
