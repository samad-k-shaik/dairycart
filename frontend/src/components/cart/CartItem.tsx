/**
 * CartItem – one line on the cart page (#27, FR-C4):
 * image, name, size, unit price, quantity selector, line subtotal and remove button.
 *
 * The line subtotal is DERIVED state: it is calculated from price × quantity on
 * every render rather than stored, so it can never get out of sync.
 */
import { Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import { QuantitySelector } from '@/components/common/QuantitySelector'
import { ProductImage } from '@/components/products/ProductImage'
import { Button } from '@/components/ui/button'
import { getLineSubtotal, type CartLine } from '@/hooks/cart/cartReducer'
import { useCart } from '@/hooks/useCart'
import { formatCurrency } from '@/lib/format'

export function CartItem({ line }: { line: CartLine }) {
  const { setQuantity, remove } = useCart()
  const label = `${line.name} ${line.size}`

  return (
    <li className="flex gap-3 rounded-2xl bg-surface p-3 shadow-card ring-1 ring-border/70 sm:gap-4">
      <Link to={`/products/${line.product_id}`} className="shrink-0" tabIndex={-1} aria-hidden="true">
        <ProductImage product={line} className="size-20 sm:size-24" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-base/6 font-semibold">
              <Link to={`/products/${line.product_id}`} className="hover:text-primary">
                {line.name}
              </Link>
            </h3>
            <p className="text-xs text-muted-foreground">
              {line.size} · {formatCurrency(line.price)} each
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => remove(line.product_id)} aria-label={`Remove ${label} from cart`}>
            <Trash2 className="text-muted-foreground" aria-hidden="true" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <QuantitySelector
            size="sm"
            value={line.quantity}
            onChange={(quantity) => setQuantity(line.product_id, quantity)}
            label={label}
          />
          <span className="text-base font-extrabold tabular-nums">{formatCurrency(getLineSubtotal(line))}</span>
        </div>
      </div>
    </li>
  )
}
