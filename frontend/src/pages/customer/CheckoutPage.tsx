/**
 * Route: `/checkout` (FR-C5).
 * Name + phone form, order summary from the cart, and "Place order".
 * Sends ONLY product ids and quantities; the backend (mock in M2) calculates prices.
 * Payment is cash on delivery: no address, shipping or payment fields (out of scope).
 */
import { useRef, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router"
import { AlertCircle, Banknote, Loader2, ShoppingCart } from "lucide-react"

import { EmptyState } from "@/components/common/EmptyState"
import { userFacingMessage } from "@/components/common/ErrorState"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { lineSubtotal } from "@/hooks/cart/cartReducer"
import { useCart } from "@/hooks/useCart"
import { useCreateOrder } from "@/hooks/useCreateOrder"
import { formatCurrency } from "@/lib/format"
import { buildCreateOrderRequest } from "@/lib/orderRequest"
import { validateName, validatePhone } from "@/lib/validation"
import { ServiceError } from "@/services/serviceError"

/** Passed to the confirmation page so it can mention a price change (FR-C8). */
export type ConfirmationState = { estimatedTotal: string }

function CheckoutPage() {
  const { lines, itemCount, estimatedTotal, clear } = useCart()
  const createOrder = useCreateOrder()
  const navigate = useNavigate()

  // Controlled inputs: React state holds what the user typed.
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  // Show a field's error only after the user leaves it, or after they try to submit.
  const [touched, setTouched] = useState({ name: false, phone: false })
  const [submitted, setSubmitted] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)

  const nameError = validateName(name)
  const phoneError = validatePhone(phone)
  const showNameError = (touched.name || submitted) && nameError
  const showPhoneError = (touched.phone || submitted) && phoneError

  if (lines.length === 0) {
    return <EmptyCheckout />
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault() // stop the browser's default full-page form submit
    setSubmitted(true)
    if (nameError) return nameRef.current?.focus()
    if (phoneError) return phoneRef.current?.focus()

    const request = buildCreateOrderRequest({ name, phone }, lines)
    if (import.meta.env.DEV) {
      // Testing requirement: show the payload in dev tools. Only ids and quantities.
      console.info("[checkout] POST /api/v1/orders payload", request)
    }

    createOrder.mutate(request, {
      onSuccess: (order) => {
        const state: ConfirmationState = { estimatedTotal }
        navigate(`/orders/${order.order_id}/confirmation`, { replace: true, state })
        clear() // FR-C6: cart is empty after a successful order
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-h1 font-bold">Checkout</h1>
        <p className="text-muted-foreground">Enter your details to place the order.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        {/* On phones the summary comes first so customers see what they are ordering. */}
        <section
          aria-labelledby="checkout-summary-heading"
          className="space-y-4 rounded-2xl bg-surface p-4 shadow-card md:p-5 lg:order-2"
        >
          <h2 id="checkout-summary-heading" className="text-h2 font-bold">
            Order summary
          </h2>
          <ul className="divide-y">
            {lines.map((line) => (
              <li key={line.product_id} className="flex justify-between gap-3 py-2.5">
                <span>
                  {line.quantity} × {line.name}{" "}
                  <span className="text-muted-foreground">{line.size}</span>
                </span>
                <span className="font-semibold">{formatCurrency(lineSubtotal(line))}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-baseline justify-between border-t pt-3">
            <span className="font-semibold">
              Estimated total ({itemCount} {itemCount === 1 ? "item" : "items"})
            </span>
            <span className="text-price font-extrabold">{formatCurrency(estimatedTotal)}</span>
          </div>
          <p className="flex gap-2 rounded-xl bg-primary-soft p-3 text-small text-primary">
            <Banknote className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Pay cash on delivery. The final total is calculated when your order is placed.
          </p>
          <Link to="/cart" className="inline-block font-semibold text-primary hover:underline">
            Edit cart
          </Link>
        </section>

        <form
          noValidate // we show our own clear messages instead of the browser's pop-ups
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl bg-surface p-4 shadow-card md:p-5 lg:order-1"
          aria-labelledby="checkout-form-heading"
        >
          <h2 id="checkout-form-heading" className="text-h2 font-bold">
            Your details
          </h2>

          <div className="grid gap-2">
            <Label htmlFor="checkout-name">Full name</Label>
            <Input
              ref={nameRef}
              id="checkout-name"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              aria-invalid={showNameError ? true : undefined}
              aria-describedby={showNameError ? "checkout-name-error" : undefined}
              placeholder="e.g. Ravi Kumar"
              className="h-11"
            />
            {showNameError && (
              <p id="checkout-name-error" className="text-small text-danger">
                {nameError}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="checkout-phone">Mobile number</Label>
            <Input
              ref={phoneRef}
              id="checkout-phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={phone}
              // Keep digits only (spaces, dashes and letters are dropped), max 10.
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
              aria-invalid={showPhoneError ? true : undefined}
              aria-describedby={showPhoneError ? "checkout-phone-error" : "checkout-phone-hint"}
              placeholder="10-digit mobile number"
              className="h-11"
            />
            {showPhoneError ? (
              <p id="checkout-phone-error" className="text-small text-danger">
                {phoneError}
              </p>
            ) : (
              <p id="checkout-phone-hint" className="text-small text-muted-foreground">
                We use it to find your orders later. No OTP needed.
              </p>
            )}
          </div>

          {createOrder.isError && <SubmitError error={createOrder.error} />}

          <Button type="submit" size="lg" className="h-12 w-full" disabled={createOrder.isPending}>
            {createOrder.isPending ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" />
                Placing order…
              </>
            ) : (
              "Place order"
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}

/** Error from the order service, in plain words. */
function SubmitError({ error }: { error: Error }) {
  const details = error instanceof ServiceError ? (error.body.error.details ?? []) : []
  return (
    <div role="alert" className="flex gap-2 rounded-xl bg-red-50 p-3 text-small text-danger">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">We could not place your order.</p>
        <p>{userFacingMessage(error)}</p>
        {details.length > 0 && (
          <ul className="mt-1 list-disc pl-4">
            {details.map((d) => (
              <li key={d.field}>
                {d.field}: {d.issue}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function EmptyCheckout() {
  return (
    <EmptyState
      icon={ShoppingCart}
      headingLevel="h1"
      title="Your cart is empty"
      description="Add some milk to your cart before checking out."
      action={
        <Button asChild>
          <Link to="/">Browse products</Link>
        </Button>
      }
    />
  )
}

export default CheckoutPage
