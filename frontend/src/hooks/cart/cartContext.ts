/**
 * The cart's React Context object.
 *
 * Context lets any component read the cart WITHOUT passing it down through
 * every layer of props ("prop drilling"). The header badge, product cards,
 * cart page and checkout all read the same cart.
 *
 * Kept in its own file (separate from CartProvider.tsx) so that hot reload
 * works well: a file should export either components or non-components.
 */
import { createContext } from 'react'
import type { Product } from '@/types/product'
import type { CartLine } from './cartReducer'

export interface CartContextValue {
  lines: CartLine[]
  itemCount: number // units, for the header badge
  estimatedTotal: string // "155.00" – display only
  add: (product: Product, quantity?: number) => void
  setQuantity: (productId: number, quantity: number) => void
  remove: (productId: number) => void
  clear: () => void
}

// `null` default: using the cart outside <CartProvider> is a bug; useCart() reports it clearly.
export const CartContext = createContext<CartContextValue | null>(null)
