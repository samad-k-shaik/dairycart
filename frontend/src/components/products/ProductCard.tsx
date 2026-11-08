/**
 * ProductCard – one product in the home page grid (#24, FR-C1).
 *
 * Shows image, name, size and price, plus a round "+" button that adds one
 * unit to the cart (#26). Clicking anywhere else on the card opens the
 * product details page (/products/:id).
 *
 * ACCESSIBILITY TRICK ("stretched link"): a <button> must not be placed inside
 * an <a>. So the link is only on the product name, and its invisible
 * `after:absolute after:inset-0` pseudo-element stretches over the whole card.
 * The "+" button sits above it (relative z-10), so both remain separately
 * clickable and reachable with the Tab key.
 */
import { Plus } from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useCart } from '@/hooks/useCart'
import { formatCurrency } from '@/lib/format'
import type { Product } from '@/types/product'
import { ProductImage } from './ProductImage'

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart()
  const label = `${product.name} ${product.size}`

  function handleAdd() {
    add(product, 1)
    toast.success(`${label} added to cart`)
  }

  return (
    <article className="group relative flex h-full flex-col gap-3 rounded-2xl bg-surface p-3 shadow-card ring-1 ring-border/70 transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-primary">
      <ProductImage product={product} />
      <div className="flex flex-1 flex-col gap-0.5 px-1">
        <h3 className="text-base/6 font-semibold">
          <Link
            to={`/products/${product.product_id}`}
            className="outline-none after:absolute after:inset-0 after:rounded-2xl after:content-['']"
          >
            {product.name}
          </Link>
        </h3>
        <p className="text-xs font-medium text-muted-foreground">{product.size}</p>
      </div>
      <div className="flex items-center justify-between px-1 pb-1">
        <span className="text-lg/6 font-extrabold">{formatCurrency(product.price)}</span>
        <Button
          size="icon"
          className="relative z-10 rounded-full"
          onClick={handleAdd}
          aria-label={`Add ${label} to cart`}
        >
          <Plus className="size-5" aria-hidden="true" />
        </Button>
      </div>
    </article>
  )
}
