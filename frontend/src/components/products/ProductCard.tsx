/**
 * ProductCard: one product in a grid. Reused across the app.
 *
 * The whole card opens /products/:id, and the round "+" button adds to the cart.
 * A button may not sit inside a link (invalid HTML, confusing for keyboards and
 * screen readers), so the link is "stretched": its ::after covers the whole card,
 * and the button sits above it with `relative z-10`.
 */
import { Link } from "react-router"
import { Plus } from "lucide-react"

import { formatCurrency } from "@/lib/format"
import { getProductImage } from "@/lib/productDisplay"
import type { Product } from "@/types/product"

type ProductCardProps = {
  product: Product
  /** Called when "+" is pressed. Wired to the cart in M2-07 (#26). */
  onAdd: (product: Product) => void
}

export function ProductCard({ product, onAdd }: ProductCardProps) {
  const label = `${product.name} ${product.size}`

  return (
    <article className="relative flex flex-col gap-3 rounded-2xl bg-surface p-3 shadow-card transition-shadow focus-within:ring-2 focus-within:ring-ring hover:shadow-md">
      <div className="aspect-square overflow-hidden rounded-xl bg-primary-soft">
        <img
          src={getProductImage(product)}
          alt={label}
          width={200}
          height={200}
          loading="lazy"
          className="size-full object-cover"
        />
      </div>

      <div className="flex flex-1 flex-col gap-0.5">
        <h3 className="text-h3 font-semibold">
          <Link
            to={`/products/${product.product_id}`}
            className="outline-none after:absolute after:inset-0 after:rounded-2xl after:content-['']"
          >
            {product.name}
            {/* Size is shown visually below; include it in the link name so screen readers
                can tell "Cow Milk 500 ml" from "Cow Milk 1 Litre". */}
            <span className="sr-only"> {product.size}</span>
          </Link>
        </h3>
        <p className="text-small text-muted-foreground">{product.size}</p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-price font-extrabold">{formatCurrency(product.price)}</span>
        {/* No stock left (#92): no add button; customers never see how many are left. */}
        {!product.in_stock ? (
          <span className="relative z-10 rounded-full bg-muted px-3 py-1.5 text-small font-semibold text-muted-foreground">
            Out of stock
          </span>
        ) : (
        <button
          type="button"
          onClick={() => onAdd(product)}
          aria-label={`Add ${label} to cart`}
          className="relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <Plus className="size-5" aria-hidden="true" />
        </button>
        )}
      </div>
    </article>
  )
}
