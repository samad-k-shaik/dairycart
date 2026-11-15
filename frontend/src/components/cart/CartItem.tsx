/**
 * CartItem: one cart line with image, name, size, unit price, quantity control,
 * line subtotal and a remove button. Receives data via props (no direct cart access).
 */
import { Link } from "react-router"
import { Trash2 } from "lucide-react"

import { QuantitySelector } from "@/components/common/QuantitySelector"
import type { CartLine } from "@/hooks/cart/cartReducer"
import { lineSubtotal } from "@/hooks/cart/cartReducer"
import { formatCurrency } from "@/lib/format"
import { getProductImage } from "@/lib/productDisplay"

type CartItemProps = {
  line: CartLine
  onQuantityChange: (quantity: number) => void
  onRemove: () => void
}

export function CartItem({ line, onQuantityChange, onRemove }: CartItemProps) {
  const label = `${line.name} ${line.size}`

  return (
    <li className="flex gap-3 rounded-2xl bg-surface p-3 shadow-card sm:gap-4">
      <Link
        to={`/products/${line.product_id}`}
        className="size-20 shrink-0 overflow-hidden rounded-xl bg-primary-soft sm:size-24"
        aria-label={`View ${label}`}
      >
        <img src={getProductImage(line)} alt="" width={96} height={96} className="size-full object-cover" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-h3 font-semibold">{line.name}</h3>
            <p className="text-small text-muted-foreground">
              {line.size} · {formatCurrency(line.price)} each
            </p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${label} from cart`}
            className="-mt-1 -mr-1 flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-red-50 hover:text-danger focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Trash2 className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <QuantitySelector
            value={line.quantity}
            onChange={onQuantityChange}
            label={`Quantity of ${label}`}
          />
          {/* Derived: calculated from price × quantity on every render, never stored. */}
          <p className="text-price font-extrabold" aria-label={`Subtotal ${formatCurrency(lineSubtotal(line))}`}>
            {formatCurrency(lineSubtotal(line))}
          </p>
        </div>
      </div>
    </li>
  )
}
