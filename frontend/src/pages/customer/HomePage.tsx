/**
 * Route: `/` (customer home, FR-C1).
 * Hero banner, category chips and a responsive grid of available products.
 */
import { useState } from "react"
import { Milk } from "lucide-react"

import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { CategoryChips } from "@/components/products/CategoryChips"
import { HeroBanner } from "@/components/products/HeroBanner"
import { ProductCard } from "@/components/products/ProductCard"
import { ProductGridSkeleton } from "@/components/products/ProductGridSkeleton"
import { Button } from "@/components/ui/button"
import { useAddToCart } from "@/hooks/useAddToCart"
import { useProducts } from "@/hooks/useProducts"
import { matchesCategory, type CategoryId } from "@/lib/productDisplay"

function HomePage() {
  // isPending / isError / data all come from useQuery inside useProducts.
  const { data: products, isPending, isError, error, refetch, isFetching } = useProducts()
  const [category, setCategory] = useState<CategoryId>("all")
  const addToCart = useAddToCart()

  const visible = products?.filter((product) => matchesCategory(product, category)) ?? []

  return (
    <div className="space-y-6">
      <HeroBanner />

      <section className="space-y-4" aria-labelledby="products-heading">
        <div className="photo-panel flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <h2 id="products-heading" className="text-h2 font-bold">
            Our milk
          </h2>
          <CategoryChips value={category} onChange={setCategory} />
        </div>

        {isPending ? (
          <>
            <p className="sr-only" role="status">
              Loading products…
            </p>
            <ProductGridSkeleton />
          </>
        ) : isError ? (
          <ErrorState
            title="We could not load the products"
            error={error}
            onRetry={() => refetch()}
            retrying={isFetching}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Milk}
            title={products.length === 0 ? "No milk available right now" : "Nothing in this category"}
            description={
              products.length === 0
                ? "All products are sold out at the moment. Please check again later."
                : "Try another category to see more products."
            }
            action={
              category !== "all" && products.length > 0 ? (
                <Button variant="outline" onClick={() => setCategory("all")}>
                  Show all products
                </Button>
              ) : undefined
            }
          />
        ) : (
          // 2 columns on phones, 3 from 768px (md), 4 from 1024px (lg): design system breakpoints.
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {visible.map((product) => (
              <ProductCard
                key={product.product_id}
                product={product}
                onAdd={(p) => addToCart(p, 1)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default HomePage
