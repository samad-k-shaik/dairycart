/**
 * OrderHistoryPage – route "/orders?phone=…" (#29, FR-C7).
 *
 * There is no login in the POC (ADR-003), so a customer finds their orders by
 * mobile number. The phone is stored in the URL QUERY PARAMETER (?phone=…):
 *  - the browser Back button and refresh keep the search;
 *  - the confirmation page can link straight to a customer's history.
 * The last phone used is also remembered in localStorage for convenience.
 *
 * The query only runs once a valid phone is in the URL (`enabled` in useCustomerOrders).
 */
import { ClipboardList, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { OrderSummaryCard } from '@/components/orders/OrderSummaryCard'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useCustomerOrders } from '@/hooks/useOrders'
import { STORAGE_KEYS } from '@/lib/constants'
import { isValidPhone, validatePhone } from '@/lib/validation'

function readLastPhone(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.lastPhone) ?? ''
  } catch {
    return ''
  }
}

function saveLastPhone(phone: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.lastPhone, phone)
  } catch {
    // Not important enough to bother the user about.
  }
}

export function OrderHistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const phoneInUrl = searchParams.get('phone') ?? ''
  const hasSearched = isValidPhone(phoneInUrl)

  // The input starts with the phone from the URL, or else the last phone used.
  const [phone, setPhone] = useState(() => phoneInUrl || readLastPhone())
  const [phoneError, setPhoneError] = useState<string>()

  const { data: orders, isPending, isError, error, refetch } = useCustomerOrders(phoneInUrl)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const message = validatePhone(phone)
    setPhoneError(message)
    if (message) return
    saveLastPhone(phone)
    setSearchParams({ phone }) // updating the URL triggers the query
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My orders" description="Enter the mobile number you used at checkout." />

      <Card className="px-5 py-5">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2 sm:max-w-md">
          <Label htmlFor="lookup-phone">Mobile number</Label>
          <div className="flex gap-2">
            <Input
              id="lookup-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              value={phone}
              onChange={(event) => setPhone(event.target.value.replace(/\D/g, ''))}
              aria-invalid={Boolean(phoneError)}
              aria-describedby={phoneError ? 'lookup-phone-error' : undefined}
              placeholder="10-digit mobile number"
            />
            <Button type="submit" className="h-11">
              <Search aria-hidden="true" />
              Find
            </Button>
          </div>
          {phoneError && (
            <p id="lookup-phone-error" className="text-xs font-semibold text-danger">
              {phoneError}
            </p>
          )}
        </form>
      </Card>

      {hasSearched && (
        <section aria-label="Orders" className="flex flex-col gap-3">
          {isPending && (
            <div className="flex flex-col gap-3" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-2xl" />
              ))}
            </div>
          )}

          {isError && <ErrorState error={error} onRetry={() => void refetch()} title="We could not load your orders" />}

          {orders && orders.length === 0 && (
            <EmptyState
              icon={ClipboardList}
              title="No orders found"
              description={`We found no orders for ${phoneInUrl}. Check the number, or place your first order.`}
              action={
                <Button asChild>
                  <Link to="/">Browse products</Link>
                </Button>
              }
            />
          )}

          {orders && orders.length > 0 && (
            <>
              <p className="text-muted-foreground">
                {orders.length} {orders.length === 1 ? 'order' : 'orders'} for {phoneInUrl}, newest first
              </p>
              <ul className="flex flex-col gap-3">
                {orders.map((order) => (
                  <OrderSummaryCard key={order.order_id} order={order} />
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  )
}
