/**
 * CartPage – route "/cart" (#27, FR-C4).
 *
 * Lists cart lines with quantity controls and line subtotals, plus a summary
 * with the ESTIMATED total and a Checkout button.
 * Layout: two columns on desktop (items | summary), stacked on mobile.
 * The cart comes from useCart() (browser storage), so there is no loading or
 * error state here, only the EMPTY state.
 */
import { ArrowRight, ShoppingCart } from 'lucide-react'
import { Link } from 'react-router'
import { CartItem } from '@/components/cart/CartItem'
import { CartSummary } from '@/components/cart/CartSummary'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { useCart } from '@/hooks/useCart'

export function CartPage() {
  const { lines, itemCount, estimatedTotal, clear } = useCart()
  const isEmpty = lines.length === 0

  if (isEmpty) {
    return (
      <div>
        <PageHeader title="Your cart" />
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          description="Add some fresh milk to get started."
          action={
            <Button asChild>
              <Link to="/">Browse products</Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Your cart"
        description={`${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
        actions={
          <Button variant="ghost" size="sm" onClick={clear} className="text-muted-foreground">
            Clear cart
          </Button>
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <ul className="flex flex-col gap-3" aria-label="Cart items">
          {lines.map((line) => (
            <CartItem key={line.product_id} line={line} />
          ))}
        </ul>

        {/* lg:sticky keeps the summary visible while scrolling a long cart on desktop. */}
        <div className="lg:sticky lg:top-24">
          <CartSummary itemCount={itemCount} estimatedTotal={estimatedTotal}>
            {/* Checkout is only reachable with items: this whole branch is skipped when the cart is empty. */}
            <Button asChild size="lg" className="w-full">
              <Link to="/checkout">
                Checkout
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </CartSummary>
        </div>
      </div>
    </div>
  )
}
