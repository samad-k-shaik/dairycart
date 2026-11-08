/**
 * Display-only product information: image, description and category.
 *
 * WHY this file exists: the API contract's Product has only
 * product_id, name, size, price and is_available. But FR-C1 needs an IMAGE and
 * FR-C2 needs a DESCRIPTION. Rather than inventing API fields the backend does
 * not have, we keep this presentation data on the frontend, looked up by the
 * product NAME (all sizes of "Cow Milk" share the same image and description).
 *
 * FUTURE: if the team adds `image_url` / `description` columns to the products
 * table and the API contract, delete this file and read the fields from Product.
 * (Suggested follow-up issue.)
 */
import type { Product, ProductCategory } from '@/types/product'

interface ProductDisplayInfo {
  image: string // path under /public, served as-is by Vite
  description: string
  category: ProductCategory
}

const DISPLAY_BY_NAME: Record<string, ProductDisplayInfo> = {
  'Cow Milk': {
    image: '/images/products/cow-milk.svg',
    description:
      'Fresh, full-cream cow milk collected every morning from local farms. Light, creamy and ideal for tea, coffee and everyday drinking.',
    category: 'cow',
  },
  'Buffalo Milk': {
    image: '/images/products/buffalo-milk.svg',
    description:
      'Rich and thick buffalo milk with a higher fat content. Perfect for homemade curd, paneer, ghee and sweets.',
    category: 'buffalo',
  },
}

/** Used when a product name is unknown (e.g. a new product added to the database). */
const FALLBACK: ProductDisplayInfo = {
  image: '/images/products/milk-generic.svg',
  description: 'Fresh milk from our local dairy.',
  category: 'cow',
}

export function getProductDisplay(product: Pick<Product, 'name'>): ProductDisplayInfo {
  return DISPLAY_BY_NAME[product.name] ?? FALLBACK
}

/** Alt text for product images (accessibility: screen readers read this aloud). */
export function getProductAlt(product: Pick<Product, 'name' | 'size'>): string {
  return `${product.name}, ${product.size} bottle`
}
