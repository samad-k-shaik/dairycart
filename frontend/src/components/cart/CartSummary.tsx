/**
 * CartSummary: item count, ESTIMATED total and the Checkout button.
 * No discounts, delivery fees or tax lines: out of scope for the POC.
 */
import { Link } from "react-router"
import { Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { formatCurrency } from "@/lib/format"
import type { Money } from "@/types/product"

type CartSummaryProps = {
  itemCount: number
  estimatedTotal: Money
}

export function CartSummary({ itemCount, estimatedTotal }: CartSummaryProps) {
  const empty = itemCount === 0
  const { user } = useAuth()

  return (
    <aside
      aria-labelledby="cart-summary-heading"
      className="space-y-4 rounded-2xl bg-surface p-4 shadow-card md:p-5"
    >
      <h2 id="cart-summary-heading" className="text-h2 font-bold">
        Order summary
      </h2>

      <dl className="space-y-2">
        <div className="flex justify-between text-muted-foreground">
          <dt>Items</dt>
          <dd>{itemCount}</dd>
        </div>
        <div className="flex items-baseline justify-between border-t pt-3">
          <dt className="font-semibold">Estimated total</dt>
          <dd className="text-price font-extrabold">{formatCurrency(estimatedTotal)}</dd>
        </div>
      </dl>

      <p className="flex gap-2 rounded-xl bg-primary-soft p-3 text-small text-primary">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Final total confirmed at checkout. Prices are checked again when you place the order.
      </p>

      {empty ? (
        <Button size="lg" className="h-12 w-full" disabled>
          Checkout
        </Button>
      ) : (
        <>
          <Button asChild size="lg" className="h-12 w-full">
            {/* Logged out: /checkout sends them to /login and back; the cart is kept (#90). */}
            <Link to="/checkout">{user ? "Checkout" : "Log in to checkout"}</Link>
          </Button>
          {!user && (
            <p className="text-center text-small text-muted-foreground">
              You need an account to order.{" "}
              <Link to="/signup" className="font-semibold text-primary hover:underline">
                Sign up
              </Link>
            </p>
          )}
        </>
      )}
    </aside>
  )
}
