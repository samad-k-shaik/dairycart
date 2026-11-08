/**
 * useCart() – the hook every component uses to read or change the cart.
 *
 *   const { lines, itemCount, add, remove } = useCart()
 *
 * Components never touch localStorage or the reducer directly; this hook is
 * the single doorway, so cart behaviour can change in one place.
 */
import { useContext } from 'react'
import { CartContext, type CartContextValue } from './cart/cartContext'

export function useCart(): CartContextValue {
  const context = useContext(CartContext)
  if (!context) {
    // A clear message for developers instead of a confusing "cannot read property of null".
    throw new Error('useCart() must be used inside <CartProvider>.')
  }
  return context
}
