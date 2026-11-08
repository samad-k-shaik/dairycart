/**
 * CartSummary – the "Order summary" box (#27) with the ESTIMATED total.
 *
 * WHY "estimated"? Prices could change between adding to cart and ordering.
 * The backend recalculates the real total from database prices (BR-1/BR-2),
 * so we tell the customer the final total is confirmed at checkout.
 *
 * No delivery fees, taxes or coupons: they are out of scope for the POC.
 * Reused on the checkout page with a different button (via `children`).
 */
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/format'

interface CartSummaryProps {
  itemCount: number
  estimatedTotal: string
  /** The action area, e.g. the Checkout button or the Place order button. */
  children?: ReactNode
}

export function CartSummary({ itemCount, estimatedTotal, children }: CartSummaryProps) {
  return (
    <Card className="gap-4 px-5 py-5">
      <h2 className="text-xl/7 font-bold">Order summary</h2>
      <dl className="flex flex-col gap-2">
        <div className="flex justify-between text-muted-foreground">
          <dt>Items</dt>
          <dd className="tabular-nums">{itemCount}</dd>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <dt>Payment</dt>
          <dd>Cash on delivery</dd>
        </div>
        <div className="flex items-baseline justify-between border-t pt-3">
          <dt className="font-semibold">Estimated total</dt>
          <dd className="text-lg font-extrabold tabular-nums">{formatCurrency(estimatedTotal)}</dd>
        </div>
      </dl>
      <p className="rounded-xl bg-primary-soft px-3 py-2 text-xs text-primary">
        Final total confirmed at checkout, using current prices.
      </p>
      {children}
    </Card>
  )
}
