/**
 * Route: `/orders?phone=9876543210` (FR-C7).
 * The phone lives in the URL query string, so the result can be bookmarked,
 * the Back button works, and the confirmation page can link straight to it.
 * The last valid phone is remembered in localStorage and reused on the next visit.
 */
import { useEffect, useState, type FormEvent } from "react"
import { Link, useSearchParams } from "react-router"
import { PackageOpen, Search } from "lucide-react"

import { OrderCard } from "@/components/orders/OrderCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useOrdersByPhone } from "@/hooks/useOrdersByPhone"
import { PHONE_PATTERN, validatePhone } from "@/lib/validation"

const LAST_PHONE_KEY = "milk-last-phone-v1"

function readLastPhone(): string {
  try {
    const value = window.localStorage.getItem(LAST_PHONE_KEY) ?? ""
    return PHONE_PATTERN.test(value) ? value : ""
  } catch {
    return "" // storage blocked: just start empty
  }
}

function saveLastPhone(phone: string) {
  try {
    window.localStorage.setItem(LAST_PHONE_KEY, phone)
  } catch {
    // ignore: remembering the phone is only a convenience
  }
}

function OrderHistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlPhone = searchParams.get("phone") ?? ""

  const [input, setInput] = useState(() => urlPhone || readLastPhone())
  const [inputError, setInputError] = useState<string | null>(null)

  // If the URL phone changes (e.g. link from the confirmation page), show it in the box.
  // Adjusting state while rendering is React's recommended way to react to a prop change.
  const [seenUrlPhone, setSeenUrlPhone] = useState(urlPhone)
  if (urlPhone !== seenUrlPhone) {
    setSeenUrlPhone(urlPhone)
    if (urlPhone) setInput(urlPhone)
  }

  // First visit without ?phone=: reuse the remembered phone, if any.
  useEffect(() => {
    if (!urlPhone) {
      const remembered = readLastPhone()
      if (remembered) setSearchParams({ phone: remembered }, { replace: true })
    }
    // Run once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Remember every valid phone that is looked up.
  useEffect(() => {
    if (PHONE_PATTERN.test(urlPhone)) saveLastPhone(urlPhone)
  }, [urlPhone])

  const orders = useOrdersByPhone(urlPhone)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const error = validatePhone(input)
    setInputError(error)
    if (!error) setSearchParams({ phone: input })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-h1 font-bold">My orders</h1>
        <p className="text-muted-foreground">Enter the mobile number you used at checkout.</p>
      </div>

      <form
        noValidate
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-card sm:flex-row sm:items-end"
        role="search"
      >
        <div className="grid flex-1 gap-2">
          <Label htmlFor="history-phone">Mobile number</Label>
          <Input
            id="history-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            value={input}
            onChange={(e) => setInput(e.target.value.replace(/\D/g, "").slice(0, 10))}
            aria-invalid={inputError ? true : undefined}
            aria-describedby={inputError ? "history-phone-error" : undefined}
            placeholder="10-digit mobile number"
            className="h-11"
          />
          {inputError && (
            <p id="history-phone-error" className="text-small text-danger">
              {inputError}
            </p>
          )}
        </div>
        <Button type="submit" size="lg" className="h-11">
          <Search aria-hidden="true" />
          Find orders
        </Button>
      </form>

      <Results phone={urlPhone} query={orders} />
    </div>
  )
}

function Results({ phone, query }: { phone: string; query: ReturnType<typeof useOrdersByPhone> }) {
  if (!phone) {
    return <p className="text-center text-muted-foreground">Your orders will appear here.</p>
  }
  if (!PHONE_PATTERN.test(phone)) {
    return (
      <p role="alert" className="rounded-2xl bg-red-50 p-4 text-center text-danger">
        “{phone}” is not a valid 10-digit mobile number.
      </p>
    )
  }
  if (query.isPending) {
    return (
      <div className="space-y-3" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface shadow-card" />
        ))}
      </div>
    )
  }
  if (query.isError) {
    return (
      <div role="alert" className="space-y-3 rounded-2xl bg-surface p-6 text-center shadow-card">
        <p className="font-semibold">We could not load your orders.</p>
        <Button variant="outline" onClick={() => query.refetch()}>
          Try again
        </Button>
      </div>
    )
  }
  if (query.data.length === 0) {
    return (
      <section className="flex flex-col items-center gap-3 rounded-2xl bg-surface px-4 py-10 text-center shadow-card">
        <PackageOpen className="size-12 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-h2 font-bold">No orders found</h2>
        <p className="max-w-sm text-muted-foreground">
          We have no orders for {phone}. Check the number, or place your first order.
        </p>
        <Button asChild>
          <Link to="/">Browse products</Link>
        </Button>
      </section>
    )
  }
  return (
    <section aria-label={`Orders for ${phone}`} className="space-y-3">
      <p className="text-small text-muted-foreground">
        {query.data.length} {query.data.length === 1 ? "order" : "orders"} · newest first
      </p>
      <ul className="space-y-3">
        {query.data.map((order) => (
          <li key={order.order_id}>
            <OrderCard order={order} />
          </li>
        ))}
      </ul>
    </section>
  )
}

export default OrderHistoryPage
