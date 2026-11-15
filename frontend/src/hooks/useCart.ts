/**
 * useCart(): read and change the cart from any component inside <CartProvider>.
 *   const { lines, itemCount, estimatedTotal, add, setQuantity, remove, clear } = useCart()
 */
import { useContext } from "react"

import { CartContext, type CartContextValue } from "@/hooks/cart/cartContext"

export function useCart(): CartContextValue {
  const cart = useContext(CartContext)
  if (!cart) {
    throw new Error("useCart() must be used inside <CartProvider> (see App.tsx).")
  }
  return cart
}
