/**
 * CheckoutPage – route "/checkout" (#28, FR-C5).
 *
 * 1. Customer enters name + mobile number (labelled inputs, inline errors).
 * 2. On submit we validate; invalid input blocks submission.
 * 3. We send ONLY { customer, items: [{ product_id, quantity }] }.
 *    NO prices, NO totals: the backend calculates them from database prices,
 *    so nobody can change what they pay by editing the request.
 * 4. On success: clear the cart and go to the confirmation page.
 *
 * Payment is cash on delivery; address, shipping and payment fields are out of scope.
 */
import { ShoppingCart } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { CartSummary } from '@/components/cart/CartSummary'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getLineSubtotal } from '@/hooks/cart/cartReducer'
import { useCart } from '@/hooks/useCart'
import { useCreateOrder } from '@/hooks/useOrders'
import { formatCurrency } from '@/lib/format'
import { NAME_MAX_LENGTH, validateName, validatePhone } from '@/lib/validation'
import { getErrorMessage, isApiRequestError } from '@/services/apiError'
import type { CreateOrderRequest } from '@/types/order'

interface FormErrors {
  name?: string
  phone?: string
}

/** State passed to the confirmation page, so it can compare totals (FR-C8). */
export interface ConfirmationState {
  estimatedTotal: string
}

export function CheckoutPage() {
  const { lines, itemCount, estimatedTotal, clear } = useCart()
  const createOrder = useCreateOrder()
  const navigate = useNavigate()

  // CONTROLLED inputs: React state is the single source of truth for what is typed.
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})

  if (lines.length === 0) {
    // Right after a successful order we clear the cart AND navigate to the confirmation
    // page. For that split second the cart is empty: render nothing instead of
    // flashing the "empty cart" message.
    if (createOrder.isSuccess) return null
    // Empty cart cannot be submitted (FR-C5).
    return (
      <div>
        <PageHeader title="Checkout" />
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          description="Add products to your cart before checking out."
          action={
            <Button asChild>
              <Link to="/">Browse products</Link>
            </Button>
          }
        />
      </div>
    )
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault() // stop the browser's default full-page form submission

    const nextErrors: FormErrors = { name: validateName(name), phone: validatePhone(phone) }
    setErrors(nextErrors)
    if (nextErrors.name || nextErrors.phone) return // invalid → do not submit

    // Build the request from ids and quantities ONLY.
    const request: CreateOrderRequest = {
      customer: { name: name.trim(), phone: phone.trim() },
      items: lines.map((line) => ({ product_id: line.product_id, quantity: line.quantity })),
    }
    if (import.meta.env.DEV) {
      // #28 testing requirement: inspect this in dev tools to confirm no prices are sent.
      console.info('POST /api/v1/orders payload', request)
    }

    // Remember the estimate BEFORE clearing the cart, for the FR-C8 price-change notice.
    const confirmationState: ConfirmationState = { estimatedTotal }

    createOrder.mutate(request, {
      onSuccess: (order) => {
        clear() // FR-C6: the cart is empty after a successful order
        void navigate(`/orders/${order.order_id}/confirmation`, { replace: true, state: confirmationState })
      },
      onError: (error) => {
        // Map backend validation details back onto our fields when possible.
        if (isApiRequestError(error) && error.code === 'VALIDATION_ERROR') {
          const fieldErrors: FormErrors = {}
          for (const detail of error.details) {
            if (detail.field === 'customer.name') fieldErrors.name = detail.issue
            if (detail.field === 'customer.phone') fieldErrors.phone = detail.issue
          }
          setErrors(fieldErrors)
        }
      },
    })
  }

  return (
    <div>
      <PageHeader title="Checkout" description="Pay with cash when your milk is delivered." />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="gap-5 px-5 py-5">
          <h2 className="text-xl/7 font-bold">Your details</h2>
          {/* noValidate: we show our own friendly messages instead of the browser's popups. */}
          <form id="checkout-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                name="name"
                autoComplete="name"
                value={name}
                maxLength={NAME_MAX_LENGTH}
                onChange={(event) => setName(event.target.value)}
                aria-invalid={Boolean(errors.name)}
                // aria-describedby links the input to its error so screen readers read both.
                aria-describedby={errors.name ? 'name-error' : undefined}
                placeholder="e.g. Ravi Kumar"
              />
              {errors.name && (
                <p id="name-error" className="text-xs font-semibold text-danger">
                  {errors.name}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">Mobile number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                inputMode="numeric" // shows the number keypad on phones
                autoComplete="tel-national"
                maxLength={10}
                value={phone}
                onChange={(event) => setPhone(event.target.value.replace(/\D/g, ''))} // digits only
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? 'phone-error' : 'phone-hint'}
                placeholder="10-digit mobile number"
              />
              {errors.phone ? (
                <p id="phone-error" className="text-xs font-semibold text-danger">
                  {errors.phone}
                </p>
              ) : (
                <p id="phone-hint" className="text-xs text-muted-foreground">
                  We use this number to find your orders later.
                </p>
              )}
            </div>

            {/* Request-level errors (e.g. product unavailable, server down). */}
            {createOrder.isError && !(isApiRequestError(createOrder.error) && createOrder.error.code === 'VALIDATION_ERROR') && (
              <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 font-semibold text-red-700">
                {getErrorMessage(createOrder.error)}
              </p>
            )}
          </form>
        </Card>

        <div className="flex flex-col gap-4 lg:sticky lg:top-24">
          <CartSummary itemCount={itemCount} estimatedTotal={estimatedTotal}>
            <ul className="flex flex-col gap-2 border-t pt-3">
              {lines.map((line) => (
                <li key={line.product_id} className="flex justify-between gap-2 text-muted-foreground">
                  <span>
                    {line.quantity} × {line.name} {line.size}
                  </span>
                  <span className="tabular-nums">{formatCurrency(getLineSubtotal(line))}</span>
                </li>
              ))}
            </ul>
            {/* form="checkout-form" connects this button to the form even though it sits outside it. */}
            <Button type="submit" form="checkout-form" size="lg" className="w-full" disabled={createOrder.isPending}>
              {createOrder.isPending ? 'Placing order…' : 'Place order'}
            </Button>
          </CartSummary>
        </div>
      </div>
    </div>
  )
}
