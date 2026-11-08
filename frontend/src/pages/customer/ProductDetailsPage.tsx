/**
 * Route: `/products/:id` (FR-C2, FR-C3).
 * Large image, name, size, price, description, quantity selector and "Add to cart".
 */
import { useState } from "react"
import { Link, useParams } from "react-router"
import { ArrowLeft, PackageSearch, ShoppingCart } from "lucide-react"
import { toast } from "sonner"

import { QuantitySelector } from "@/components/common/QuantitySelector"
import { Button } from "@/components/ui/button"
import { useProduct } from "@/hooks/useProduct"
import { formatCurrency } from "@/lib/format"
import { multiplyMoney } from "@/lib/money"
import { getProductDescription, getProductImage } from "@/lib/productDisplay"
import { ServiceError } from "@/services/serviceError"
import type { Product } from "@/types/product"

function ProductDetailsPage() {
  // useParams reads ":id" from the URL as text, e.g. "2". Number("abc") is NaN,
  // which the service rejects (422) and we show as "not found".
  const { id } = useParams()
  const productId = Number(id)
  const { data: product, isPending, isError, error, refetch } = useProduct(productId)

  return (
    <div className="space-y-4">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 rounded-xl font-semibold text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to products
      </Link>

      {isPending ? (
        <DetailsSkeleton />
      ) : isError ? (
        error instanceof ServiceError && (error.status === 404 || error.status === 422) ? (
          <ProductNotFound />
        ) : (
          <div className="space-y-3 rounded-2xl bg-surface p-6 text-center shadow-card" role="alert">
            <p className="font-semibold">We could not load this product.</p>
            <Button variant="outline" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        )
      ) : (
        // key: a fresh component (quantity back to 1) when moving to another product.
        <ProductDetails key={product.product_id} product={product} />
      )}
    </div>
  )
}

function ProductDetails({ product }: { product: Product }) {
  // The page owns the quantity; QuantitySelector only reports changes (controlled component).
  const [quantity, setQuantity] = useState(1)
  const label = `${product.name} ${product.size}`
  const estimate = formatCurrency(multiplyMoney(product.price, quantity))

  // Temporary until the cart exists (M2-07, #26).
  function handleAddToCart() {
    toast.info(`${quantity} × ${label}`, {
      description: "Adding to the cart arrives in the next update.",
    })
  }

  return (
    <article className="grid gap-6 md:grid-cols-2 md:gap-10">
      <div className="aspect-square overflow-hidden rounded-2xl bg-primary-soft shadow-card">
        <img
          src={getProductImage(product)}
          alt={label}
          width={400}
          height={400}
          className="size-full object-contain p-6"
        />
      </div>

      <div className="flex flex-col gap-4">
        <div className="space-y-1">
          <h1 className="text-h1 font-bold">{product.name}</h1>
          <p className="text-muted-foreground">{product.size}</p>
        </div>
        <p className="text-price font-extrabold">{formatCurrency(product.price)}</p>
        <p className="text-muted-foreground">{getProductDescription(product)}</p>

        {product.is_available ? (
          <>
            <div className="space-y-2">
              <p className="font-semibold">Quantity</p>
              <QuantitySelector
                value={quantity}
                onChange={setQuantity}
                label={`Quantity of ${label}`}
              />
              <p className="text-small text-muted-foreground">You can order 1 to 20 at a time.</p>
            </div>

            {/* Desktop/tablet: button in the normal flow. */}
            <Button size="lg" className="hidden h-12 md:inline-flex" onClick={handleAddToCart}>
              <ShoppingCart aria-hidden="true" />
              Add to cart · {estimate}
            </Button>
          </>
        ) : (
          <p className="rounded-xl bg-red-50 p-3 font-semibold text-danger" role="status">
            This product is currently unavailable.
          </p>
        )}
      </div>

      {/* Phone: sticky bar that stays at the bottom of the screen while scrolling.
          It is a child of the whole <article> (not the text column) because a sticky
          element can only move inside its parent; the article starts at the top, so the
          bar can stick to the screen bottom even on short screens. */}
      {product.is_available && (
        <div className="sticky bottom-0 z-30 -mx-4 border-t bg-surface/95 px-4 py-3 backdrop-blur md:hidden">
          <Button size="lg" className="h-12 w-full" onClick={handleAddToCart}>
            <ShoppingCart aria-hidden="true" />
            Add to cart · {estimate}
          </Button>
        </div>
      )}
    </article>
  )
}

function ProductNotFound() {
  return (
    <section className="flex flex-col items-center gap-4 rounded-2xl bg-surface py-12 text-center shadow-card">
      <PackageSearch className="size-12 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-h1 font-bold">Product not found</h1>
      <p className="max-w-sm text-muted-foreground">
        We could not find this product. It may have been removed, or the link may be wrong.
      </p>
      <Button asChild>
        <Link to="/">Browse all products</Link>
      </Button>
    </section>
  )
}

function DetailsSkeleton() {
  return (
    <div className="grid animate-pulse gap-6 md:grid-cols-2 md:gap-10" aria-hidden="true">
      <div className="aspect-square rounded-2xl bg-muted" />
      <div className="space-y-4">
        <div className="h-8 w-2/3 rounded bg-muted" />
        <div className="h-5 w-1/4 rounded bg-muted" />
        <div className="h-6 w-1/3 rounded bg-muted" />
        <div className="h-16 rounded bg-muted" />
        <div className="h-11 w-36 rounded-xl bg-muted" />
      </div>
    </div>
  )
}

export default ProductDetailsPage
