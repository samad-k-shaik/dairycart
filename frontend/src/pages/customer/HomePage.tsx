/**
 * HomePage – route "/" (#24, FR-C1).
 *
 * Shows every AVAILABLE product (the service already hides unavailable ones)
 * as a responsive grid: 2 columns on phones, 3 on tablets (md), 4 on desktop (lg).
 * Cow / Buffalo chips filter the grid on the client side.
 *
 * Every data screen handles 4 states (#32): loading → skeleton,
 * error → ErrorState with retry, empty → EmptyState, success → the grid.
 */
import { PackageOpen } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { CategoryChips, type CategoryFilter } from '@/components/products/CategoryChips'
import { HeroBanner } from '@/components/products/HeroBanner'
import { ProductCard } from '@/components/products/ProductCard'
import { ProductGridSkeleton } from '@/components/products/ProductGridSkeleton'
import { Button } from '@/components/ui/button'
import { useProducts } from '@/hooks/useProducts'
import { getProductDisplay } from '@/lib/productDisplay'

export function HomePage() {
  const { data: products, isPending, isError, error, refetch } = useProducts()
  const [category, setCategory] = useState<CategoryFilter>('all')

  // Derived data: recalculated on each render from `products` + `category`; never stored separately.
  const visibleProducts =
    category === 'all' ? products : products?.filter((product) => getProductDisplay(product).category === category)

  return (
    <div className="flex flex-col gap-6">
      <HeroBanner />

      <section className="flex flex-col gap-4" aria-labelledby="products-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="products-heading" className="text-xl/7 font-bold">
            Our milk
          </h2>
          <CategoryChips value={category} onChange={setCategory} />
        </div>

        {isPending && <ProductGridSkeleton />}

        {isError && <ErrorState error={error} onRetry={() => void refetch()} title="We could not load products" />}

        {visibleProducts && visibleProducts.length === 0 && (
          <EmptyState
            icon={PackageOpen}
            title={category === 'all' ? 'No products available right now' : 'No products in this category'}
            description={category === 'all' ? 'Please check back later.' : 'Try another milk type.'}
            action={
              category !== 'all' && (
                <Button variant="outline" onClick={() => setCategory('all')}>
                  Show all products
                </Button>
              )
            }
          />
        )}

        {visibleProducts && visibleProducts.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {visibleProducts.map((product) => (
              <li key={product.product_id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
