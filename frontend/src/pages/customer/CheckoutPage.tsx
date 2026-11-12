/**
 * Route: `/checkout` (FR-C5).
 * Name + phone form, order summary from the cart, and "Place order".
 * #97: the customer chooses "Order once" (a normal order) or "Subscribe" (the same items
 * every day for 1 week, 15 days or 1 month, from a start date they pick).
 * Sends ONLY product ids and quantities; the backend calculates prices and the total.
 * Payment is cash on delivery: no address, shipping or payment fields (out of scope).
 */
import { useRef, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router"
import { AlertCircle, Banknote, CalendarDays, Loader2, Repeat, ShoppingBag, ShoppingCart } from "lucide-react"
import { toast } from "sonner"

import { EmptyState } from "@/components/common/EmptyState"
import { userFacingMessage } from "@/components/common/ErrorState"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { lineSubtotal } from "@/hooks/cart/cartReducer"
import { useAuth } from "@/hooks/useAuth"
import { useCart } from "@/hooks/useCart"
import { useCreateOrder } from "@/hooks/useCreateOrder"
import { useCreateSubscription } from "@/hooks/useSubscriptions"
import { formatCurrency } from "@/lib/format"
import { splitCheckoutErrors } from "@/lib/checkoutErrors"
import { buildCreateOrderRequest } from "@/lib/orderRequest"
import {
  buildCreateSubscriptionRequest,
  endDateFor,
  estimatePlanTotal,
  formatDay,
  planDays,
  PLAN_OPTIONS,
  startDateRange,
  validateStartDate,
} from "@/lib/subscription"
import { cn } from "@/lib/utils"
import { validateName, validatePhone } from "@/lib/validation"
import { ServiceError } from "@/services/serviceError"
import type { SubscriptionPlan } from "@/types/subscription"

/** Passed to the confirmation page so it can mention a price change (FR-C8). */
export type ConfirmationState = { estimatedTotal: string }

/** #97: a normal one-time order, or a daily subscription. */
type OrderMode = "once" | "subscribe"

function CheckoutPage() {
  const { lines, itemCount, estimatedTotal, clear } = useCart()
  const createOrder = useCreateOrder()
  const createSubscription = useCreateSubscription()
  const navigate = useNavigate()

  // #97: order once, or subscribe. The start date defaults to tomorrow (India time).
  const [mode, setMode] = useState<OrderMode>("once")
  const [plan, setPlan] = useState<SubscriptionPlan>("WEEK")
  const [startDate, setStartDate] = useState(() => startDateRange().min)
  const startRef = useRef<HTMLInputElement>(null)
  const subscribing = mode === "subscribe"
  // The request that is in use: errors and "pending" come from it.
  const active = subscribing ? createSubscription : createOrder

  const { user } = useAuth()

  // Controlled inputs: React state holds what the user typed.
  // Name starts as the account's name (#90); it is the delivery contact and can be changed.
  const [name, setName] = useState(user?.full_name ?? "")
  const [phone, setPhone] = useState("")
  // Show a field's error only after the user leaves it, or after they try to submit.
  const [touched, setTouched] = useState({ name: false, phone: false })
  const [submitted, setSubmitted] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)

  const nameError = validateName(name)
  const phoneError = validatePhone(phone)
  const startError = subscribing ? validateStartDate(startDate) : ""
  // Backend 422 errors for name/phone (and #97 start date) go next to the field;
  // others stay in the error box.
  const allServerDetails = active.error instanceof ServiceError ? active.error.body.error.details : undefined
  const serverStartError = allServerDetails?.some((d) => d.field === "start_date") ?? false
  const serverErrors = splitCheckoutErrors(allServerDetails?.filter((d) => d.field !== "start_date"))
  const showStartError = (submitted && startError) || (serverStartError ? (active.error?.message ?? "") : "")
  const showNameError = ((touched.name || submitted) && nameError) || serverErrors.name
  const showPhoneError = ((touched.phone || submitted) && phoneError) || serverErrors.phone

  /** Typing again clears the old server error, so it does not stick to the new value. */
  function clearServerError() {
    if (createOrder.isError) createOrder.reset()
    if (createSubscription.isError) createSubscription.reset()
  }

  if (lines.length === 0) {
    return <EmptyCheckout />
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault() // stop the browser's default full-page form submit
    setSubmitted(true)
    if (nameError) return nameRef.current?.focus()
    if (phoneError) return phoneRef.current?.focus()
    if (startError) return startRef.current?.focus()

    if (subscribing) {
      const request = buildCreateSubscriptionRequest(plan, startDate, { name, phone }, lines)
      createSubscription.mutate(request, {
        onSuccess: (subscription) => {
          toast.success("Subscription started", {
            description: `${formatDay(subscription.start_date)} – ${formatDay(subscription.end_date)}`,
          })
          navigate("/subscriptions", { replace: true })
          clear() // the cart has become the subscription
        },
      })
      return
    }

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
      <div className="photo-panel space-y-1 px-4 py-3">
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
              {subscribing ? "Each day" : "Estimated total"} ({itemCount} {itemCount === 1 ? "item" : "items"})
            </span>
            <span className="text-price font-extrabold">{formatCurrency(estimatedTotal)}</span>
          </div>
          {subscribing && (
            <div className="flex items-baseline justify-between" data-testid="plan-total">
              <span className="font-semibold">Plan total ({planDays(plan)} days)</span>
              <span className="text-price font-extrabold">
                {formatCurrency(estimatePlanTotal(estimatedTotal, plan))}
              </span>
            </div>
          )}
          <p className="flex gap-2 rounded-xl bg-primary-soft p-3 text-small text-primary">
            <Banknote className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {subscribing
              ? "Pay cash on each delivery. Today's prices are locked for the whole plan."
              : "Pay cash on delivery. The final total is calculated when your order is placed."}
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
          <fieldset>
            <legend className="mb-3 text-h2 font-bold">How do you want to order?</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <ModeOption
                checked={!subscribing}
                onSelect={() => {
                  setMode("once")
                  clearServerError()
                }}
                Icon={ShoppingBag}
                title="Order once"
                description="Just this order, delivered once."
              />
              <ModeOption
                checked={subscribing}
                onSelect={() => {
                  setMode("subscribe")
                  clearServerError()
                }}
                Icon={Repeat}
                title="Subscribe"
                description="The same items every day. Cancel any time."
              />
            </div>
          </fieldset>

          {subscribing && (
            <div className="space-y-4 rounded-xl border p-3 md:p-4">
              <div>
                <p id="checkout-plan-label" className="mb-2 font-semibold">
                  Plan
                </p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="checkout-plan-label">
                  {PLAN_OPTIONS.map((option) => (
                    <button
                      key={option.plan}
                      type="button"
                      role="radio"
                      aria-checked={plan === option.plan}
                      onClick={() => {
                        setPlan(option.plan)
                        clearServerError()
                      }}
                      className={cn(
                        "h-11 rounded-full border px-4 font-semibold transition-colors",
                        plan === option.plan
                          ? "border-primary bg-primary text-primary-foreground"
                          : "bg-surface hover:bg-muted",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="checkout-start">First delivery</Label>
                <Input
                  ref={startRef}
                  id="checkout-start"
                  type="date"
                  min={startDateRange().min}
                  max={startDateRange().max}
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    clearServerError()
                  }}
                  aria-invalid={showStartError ? true : undefined}
                  aria-describedby={showStartError ? "checkout-start-error" : "checkout-start-hint"}
                  className="h-11"
                />
                {showStartError ? (
                  <p id="checkout-start-error" className="text-small text-danger">
                    {showStartError}
                  </p>
                ) : (
                  <p id="checkout-start-hint" className="flex gap-1.5 text-small text-muted-foreground">
                    <CalendarDays className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    {startError
                      ? "Choose a day from tomorrow up to 30 days ahead."
                      : `Every day from ${formatDay(startDate)} to ${formatDay(endDateFor(startDate, plan))}.`}
                  </p>
                )}
              </div>
            </div>
          )}

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
              onChange={(e) => {
                setName(e.target.value)
                clearServerError()
              }}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              aria-invalid={showNameError ? true : undefined}
              aria-describedby={showNameError ? "checkout-name-error" : undefined}
              placeholder="e.g. Ravi Kumar"
              className="h-11"
            />
            {showNameError && (
              <p id="checkout-name-error" className="text-small text-danger">
                {showNameError}
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
              onChange={(e) => {
                setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                clearServerError()
              }}
              onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
              aria-invalid={showPhoneError ? true : undefined}
              aria-describedby={showPhoneError ? "checkout-phone-error" : "checkout-phone-hint"}
              placeholder="10-digit mobile number"
              className="h-11"
            />
            {showPhoneError ? (
              <p id="checkout-phone-error" className="text-small text-danger">
                {showPhoneError}
              </p>
            ) : (
              <p id="checkout-phone-hint" className="text-small text-muted-foreground">
                We use it to find your orders later. No OTP needed.
              </p>
            )}
          </div>

          {active.isError && !serverStartError && (
            <SubmitError error={active.error} otherDetails={serverErrors.other} subscribing={subscribing} />
          )}

          <Button type="submit" size="lg" className="h-12 w-full" disabled={active.isPending}>
            {active.isPending ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" />
                {subscribing ? "Subscribing…" : "Placing order…"}
              </>
            ) : subscribing ? (
              `Subscribe for ${planDays(plan)} days`
            ) : (
              "Place order"
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}

/** Error from the order service, in plain words. Field errors are shown at their field;
 *  `otherDetails` are the problems that belong to no field (e.g. an item). */
function SubmitError({
  error,
  otherDetails,
  subscribing = false,
}: {
  error: Error
  otherDetails: { field: string; issue: string }[]
  subscribing?: boolean
}) {
  const details = otherDetails
  const onlyFieldErrors = error instanceof ServiceError && error.code === "VALIDATION_ERROR" && details.length === 0
  return (
    <div role="alert" className="flex gap-2 rounded-xl bg-red-50 p-3 text-small text-danger">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">
          {subscribing ? "We could not start your subscription." : "We could not place your order."}
        </p>
        <p>{onlyFieldErrors ? "Please check the highlighted fields." : userFacingMessage(error)}</p>
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

/** One of the two big "Order once" / "Subscribe" choices (a styled radio button). */
function ModeOption({
  checked,
  onSelect,
  Icon,
  title,
  description,
}: {
  checked: boolean
  onSelect: () => void
  Icon: typeof ShoppingBag
  title: string
  description: string
}) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
        checked ? "border-primary bg-primary-soft" : "hover:bg-muted",
      )}
    >
      <input
        type="radio"
        name="order-mode"
        className="mt-1 size-4 accent-primary"
        checked={checked}
        onChange={onSelect}
      />
      <span className="space-y-0.5">
        <span className="flex items-center gap-1.5 font-semibold">
          <Icon className="size-4 text-primary" aria-hidden="true" />
          {title}
        </span>
        <span className="block text-small text-muted-foreground">{description}</span>
      </span>
    </label>
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
