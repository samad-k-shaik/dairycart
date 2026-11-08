/**
 * ProductImage – the square product picture on a soft background.
 * Used by ProductCard, the details page and cart lines, so images look the same everywhere.
 */
import { getProductAlt, getProductDisplay } from '@/lib/productDisplay'
import { cn } from '@/lib/utils'
import type { Product } from '@/types/product'

interface ProductImageProps {
  product: Pick<Product, 'name' | 'size'>
  className?: string
  /** 'eager' for the big image on the details page; 'lazy' (default) loads only when scrolled into view. */
  loading?: 'eager' | 'lazy'
}

export function ProductImage({ product, className, loading = 'lazy' }: ProductImageProps) {
  return (
    <div className={cn('aspect-square overflow-hidden rounded-xl bg-background', className)}>
      <img
        src={getProductDisplay(product).image}
        alt={getProductAlt(product)}
        loading={loading}
        width={400}
        height={400} // width/height reserve space → no layout jump while loading
        className="size-full object-cover"
      />
    </div>
  )
}
