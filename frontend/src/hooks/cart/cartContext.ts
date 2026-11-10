/**
 * The cart "context": a shared box that CartProvider fills and useCart() reads.
 * Kept in its own file so CartProvider.tsx only exports a component (React fast refresh).
 */
import { createContext } from "react"

import type { Money, Product } from "@/types/product"
import type { CartLine } from "./cartReducer"

export type AddResult = {
  /** Quantity of this product in the cart after adding. */
  quantity: number
  /** How many were actually added (less than asked if the 20 cap was hit; 0 if already full). */
  added: number
}

export type CartContextValue = {
  lines: CartLine[]
  /** Total bottles, for the header icon. */
  itemCount: number
  /** Display estimate only; the backend calculates the real total. */
  estimatedTotal: Money
  add: (product: Pick<Product, "product_id" | "name" | "size" | "price">, quantity?: number) => AddResult
  setQuantity: (productId: number, quantity: number) => void
  remove: (productId: number) => void
  /** Undo a remove: put the line back at its old position. */
  restore: (line: CartLine, index: number) => void
  clear: () => void
}

export const CartContext = createContext<CartContextValue | null>(null)
