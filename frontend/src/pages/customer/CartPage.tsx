/**
 * Route: `/cart` (FR-C4).
 * Cart lines with quantity controls and line subtotals, an estimated total and Checkout.
 * Two columns from 1024px (items | summary), stacked on smaller screens.
 */
import { Link } from "react-router"
import { ShoppingCart } from "lucide-react"
import { toast } from "sonner"

import { CartItem } from "@/components/cart/CartItem"
import { CartSummary } from "@/components/cart/CartSummary"
import { EmptyState } from "@/components/common/EmptyState"
import { Button } from "@/components/ui/button"
import type { CartLine } from "@/hooks/cart/cartReducer"
import { useCart } from "@/hooks/useCart"

function CartPage() {
  const { lines, itemCount, estimatedTotal, setQuantity, remove, restore } = useCart()

  function handleRemove(line: CartLine, index: number) {
    remove(line.product_id)
    toast(`Removed ${line.name} ${line.size}`, {
      // Undo puts the same line (same quantity) back where it was.
      action: { label: "Undo", onClick: () => restore(line, index) },
    })
  }

  return (
    <div className="space-y-6">
      <h1 className="photo-panel w-fit px-4 py-2 text-h1 font-bold">
        Your cart{" "}
        {itemCount > 0 && (
          <span className="text-muted-foreground">
            ({itemCount} {itemCount === 1 ? "item" : "items"})
          </span>
        )}
      </h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        {lines.length === 0 ? (
          <EmptyCart />
        ) : (
          <ul className="space-y-3" aria-label="Cart items">
            {/* key = product_id: stable and unique per line, so React keeps the right
                row when lines are removed or reordered. */}
            {lines.map((line, index) => (
              <CartItem
                key={line.product_id}
                line={line}
                onQuantityChange={(quantity) => setQuantity(line.product_id, quantity)}
                onRemove={() => handleRemove(line, index)}
              />
            ))}
          </ul>
        )}

        <div className="lg:sticky lg:top-24">
          <CartSummary itemCount={itemCount} estimatedTotal={estimatedTotal} />
        </div>
      </div>
    </div>
  )
}

/** The cart lives in the browser, so it has no loading or error state — only empty. */
function EmptyCart() {
  return (
    <EmptyState
      icon={ShoppingCart}
      title="Your cart is empty"
      description="Add some fresh cow or buffalo milk and it will show up here."
      action={
        <Button asChild>
          <Link to="/">Browse products</Link>
        </Button>
      }
    />
  )
}

export default CartPage
