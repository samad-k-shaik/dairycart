/**
 * ProductDetailsPage – route "/products/:id" (#25, FR-C2, FR-C3).
 *
 * - Reads the product id from the URL with `useParams()`.
 * - Shows a large image, name, size, price, description and a QuantitySelector (1–20).
 * - "Add to cart" adds the chosen quantity (#26). On phones the button sits in
 *   a sticky bar at the bottom of the screen so it is always within thumb reach.
 * - Unknown or invalid ids show a friendly "Product not found" state.
 */
import { ArrowLeft, PackageX, ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { QuantitySelector } from '@/components/common/QuantitySelector'
import { ProductImage } from '@/components/products/ProductImage'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCart } from '@/hooks/useCart'
import { useProduct } from '@/hooks/useProducts'
import { formatCurrency } from '@/lib/format'
import { multiplyMoney } from '@/lib/money'
import { getProductDisplay } from '@/lib/productDisplay'
import { isApiRequestError } from '@/services/apiError'

export function ProductDetailsPage() {
  // URL parameters are always strings ("2"), so convert to a number.
  const { id } = useParams()
  const productId = Number(id)
  const isValidId = Number.isInteger(productId) && productId > 0

  const { data: product, isPending, isError, error, refetch } = useProduct(productId)
  const { add } = useCart()
  const navigate = useNavigate()
  // Local state: the quantity only matters on this page until "Add to cart" is pressed.
  const [quantity, setQuantity] = useState(1)

  const backLink = (
    <Link to="/" className="mb-4 inline-flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden="true" />
      Back to products
    </Link>
  )

  // Invalid id in the URL, or the service answered 404 → "not found" state.
  if (!isValidId || (isError && isApiRequestError(error) && error.code === 'NOT_FOUND')) {
    return (
      <div>
        {backLink}
        <EmptyState
          icon={PackageX}
          title="Product not found"
          description="This product does not exist or is no longer listed."
          action={
            <Button asChild>
              <Link to="/">Browse products</Link>
            </Button>
          }
        />
      </div>
    )
  }

  if (isError) {
    return (
      <div>
        {backLink}
        <ErrorState error={error} onRetry={() => void refetch()} title="We could not load this product" />
      </div>
    )
  }

  if (isPending) {
    return (
      <div aria-busy="true">
        {backLink}
        <div className="grid gap-6 md:grid-cols-2 md:gap-10">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-5 w-1/4" />
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    )
  }

  const label = `${product.name} ${product.size}`
  const { description } = getProductDisplay(product)

  function handleAddToCart() {
    if (!product) return
    add(product, quantity)
    toast.success(`${quantity} × ${label} added to cart`, {
      action: { label: 'View cart', onClick: () => void navigate('/cart') },
    })
    setQuantity(1)
  }

  const addButton = (
    <Button size="lg" className="w-full md:w-auto" onClick={handleAddToCart} disabled={!product.is_available}>
      <ShoppingCart aria-hidden="true" />
      {product.is_available ? `Add to cart · ${formatCurrency(multiplyMoney(product.price, quantity))}` : 'Currently unavailable'}
    </Button>
  )

  return (
    // pb-28 on mobile leaves room so the sticky bar never hides content.
    <div className="pb-28 md:pb-0">
      {backLink}
      <div className="grid gap-6 md:grid-cols-2 md:gap-10">
        <ProductImage product={product} loading="eager" className="rounded-2xl bg-surface shadow-card" />

        <div className="flex flex-col gap-5">
          <div>
            <h1 className="text-2xl/8 font-bold tracking-tight">{product.name}</h1>
            <p className="mt-1 text-muted-foreground">{product.size}</p>
          </div>
          <p className="text-[28px]/9 font-extrabold">{formatCurrency(product.price)}</p>
          <p className="text-muted-foreground">{description}</p>

          {product.is_available ? (
            <div className="flex flex-col gap-2">
              <span className="font-semibold">Quantity</span>
              <QuantitySelector value={quantity} onChange={setQuantity} label={label} />
              <span className="text-xs text-muted-foreground">You can order 1 to 20 bottles.</span>
            </div>
          ) : (
            <p className="rounded-xl bg-amber-50 px-3 py-2 font-semibold text-amber-700">
              This product is currently unavailable.
            </p>
          )}

          {/* Desktop: button in the normal flow */}
          <div className="hidden md:block">{addButton}</div>
        </div>
      </div>

      {/* Mobile: sticky bar fixed to the bottom of the screen */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-surface p-4 shadow-[0_-4px_12px_rgba(15,23,42,0.06)] md:hidden">
        {addButton}
      </div>
    </div>
  )
}
